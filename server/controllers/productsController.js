const {
  applyFinanceEntry,
  getPool,
  logItemReport,
  logTransaction,
  parseNumeric,
} = require("./erpHelpers");

function normalizeIncomingIds(idsRaw, buyPrice = 0) {
  if (!Array.isArray(idsRaw)) {
    return [];
  }

  return idsRaw
    .map((value) => {
      if (value && typeof value === "object") {
        return String(value.id || "").trim();
      }

      return String(value || "").trim();
    })
    .filter(Boolean)
    .map((idValue) => ({ id: idValue, buy_price: buyPrice }));
}

function normalizeStoredIds(idsRaw, fallbackBuyPrice = 0) {
  if (!Array.isArray(idsRaw)) {
    return [];
  }

  return idsRaw
    .map((value) => {
      if (value && typeof value === "object") {
        return {
          id: String(value.id || "").trim(),
          buy_price: parseNumeric(value.buy_price, fallbackBuyPrice),
        };
      }

      return {
        id: String(value || "").trim(),
        buy_price: fallbackBuyPrice,
      };
    })
    .filter((item) => Boolean(item.id));
}

function getIdValue(item) {
  return String(item?.id || "").trim();
}

async function getProducts(req, res) {
  try {
    const search = String(req.query.search || "").trim();
    const values = [];
    let where = "";

    if (search) {
      values.push(`%${search}%`);
      where = "WHERE name ILIKE $1 OR category ILIKE $1";
    }

    const { rows } = await getPool().query(
      `
        SELECT id, name, category, stock, default_price, ids, image_url
        FROM products
        ${where}
        ORDER BY id DESC
      `,
      values
    );

    res.json(rows);
  } catch (_error) {
    res.status(500).json({ error: "Failed to load products" });
  }
}

async function createProduct(req, res) {
  const {
    name,
    category,
    default_price: defaultPriceRaw,
    stock: stockRaw,
    ids: idsRaw,
    image_url: imageUrl,
  } = req.body || {};

  if (!name || !category) {
    return res.status(400).json({ error: "name and category are required" });
  }

  const defaultPrice = parseNumeric(defaultPriceRaw, -1);
  const ids = normalizeIncomingIds(idsRaw, defaultPrice);
  const idValues = ids.map(getIdValue);
  const uniqueValues = [...new Set(idValues)];
  const uniqueIds = uniqueValues.map((idValue) => ({ id: idValue, buy_price: defaultPrice }));

  if (ids.length !== uniqueIds.length) {
    return res.status(400).json({ error: "Duplicate IDs are not allowed" });
  }

  if (defaultPrice < 0) {
    return res.status(400).json({ error: "default_price must be >= 0" });
  }

  const stock = Number.isFinite(Number(stockRaw)) ? Number(stockRaw) : uniqueIds.length;

  if (!Number.isInteger(stock) || stock < 0) {
    return res.status(400).json({ error: "stock must be a positive integer" });
  }

  if (uniqueIds.length > 0 && stock !== uniqueIds.length) {
    return res.status(400).json({
      error: "For tracked items, stock must equal ids.length",
    });
  }

  try {
    const client = await getPool().connect();

    try {
      await client.query("BEGIN");

      const { rows } = await client.query(
        `
          INSERT INTO products (name, category, stock, default_price, ids, image_url)
          VALUES ($1, $2, $3, $4, $5::jsonb, $6)
          RETURNING id, name, category, stock, default_price, ids, image_url
        `,
        [name.trim(), category.trim(), stock, defaultPrice, JSON.stringify(uniqueIds), imageUrl || null]
      );

      const product = rows[0];

      if (stock > 0) {
        if (uniqueIds.length > 0) {
          for (let index = 0; index < uniqueIds.length; index += 1) {
            const trackedId = uniqueIds[index].id;
            await logItemReport(client, {
              productId: product.id,
              itemId: trackedId,
              type: "buy",
              quantity: 1,
              buyPrice: defaultPrice,
              sellPrice: null,
              price: defaultPrice,
              profit: 0,
              remainingStock: index + 1,
            });
          }
        } else {
          await logItemReport(client, {
            productId: product.id,
            itemId: null,
            type: "buy",
            quantity: stock,
            buyPrice: defaultPrice,
            sellPrice: null,
            price: defaultPrice,
            profit: 0,
            remainingStock: stock,
          });
        }

        await logTransaction(client, product.id, "buy", defaultPrice * stock);
      }

      await client.query("COMMIT");

      return res.status(201).json(product);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (_error) {
    return res.status(500).json({ error: "Failed to create product" });
  }
}

async function deleteProduct(req, res) {
  const productId = Number(req.params.id);

  if (!Number.isInteger(productId)) {
    return res.status(400).json({ error: "Invalid product id" });
  }

  try {
    const { rowCount } = await getPool().query(
      `DELETE FROM products WHERE id = $1 RETURNING id`,
      [productId]
    );

    if (!rowCount) {
      return res.status(404).json({ error: "Product not found" });
    }

    return res.json({ ok: true });
  } catch (_error) {
    return res.status(500).json({ error: "Failed to delete product" });
  }
}

async function buyProduct(req, res) {
  const productId = Number(req.params.id);
  const {
    quantity: quantityRaw,
    ids: idsRaw,
    price: priceRaw,
    payment_source: paymentSourceRaw,
  } = req.body || {};

  if (!Number.isInteger(productId)) {
    return res.status(400).json({ error: "Invalid product id" });
  }

  const client = await getPool().connect();

  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `SELECT id, stock, default_price, ids FROM products WHERE id = $1 FOR UPDATE`,
      [productId]
    );

    if (!rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Product not found" });
    }

    const product = rows[0];
    const unitPrice = parseNumeric(priceRaw, parseNumeric(product.default_price, 0));
    const paymentSource = String(paymentSourceRaw || "credit").trim().toLowerCase();

    if (paymentSource !== "balance" && paymentSource !== "credit") {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "payment_source must be balance or credit" });
    }

    const currentIds = normalizeStoredIds(product.ids, parseNumeric(product.default_price, 0));
    const trackedBuyIds = normalizeIncomingIds(idsRaw, unitPrice);
    const incomingValues = trackedBuyIds.map(getIdValue);
    const uniqueIncomingValues = [...new Set(incomingValues)];
    const uniqueIncoming = uniqueIncomingValues.map((idValue) => ({ id: idValue, buy_price: unitPrice }));

    if (trackedBuyIds.length !== uniqueIncoming.length) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Duplicate incoming IDs are not allowed" });
    }

    const currentValuesSet = new Set(currentIds.map(getIdValue));
    const duplicateExisting = uniqueIncoming.find((item) => currentValuesSet.has(getIdValue(item)));

    if (duplicateExisting) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: `Duplicate ID: ${getIdValue(duplicateExisting)}` });
    }

    if (currentIds.length > 0 && trackedBuyIds.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Tracked products must be bought with IDs" });
    }

    if (trackedBuyIds.length > 0) {
      const newIds = [...currentIds, ...uniqueIncoming];
      const purchasedCount = uniqueIncoming.length;
      const newStock = product.stock + purchasedCount;
      const purchaseAmount = unitPrice * purchasedCount;

      await applyFinanceEntry(client, {
        accountType: paymentSource,
        direction: paymentSource === "balance" ? "out" : "in",
        amount: purchaseAmount,
        note: `Buy tracked IDs for product #${productId}`,
        source: paymentSource === "balance" ? "buy-balance" : "buy-credit",
        referenceType: "product",
        referenceId: productId,
      });

      await client.query(
        `UPDATE products SET stock = $1, ids = $2::jsonb, updated_at = NOW() WHERE id = $3`,
        [newStock, JSON.stringify(newIds), productId]
      );

      for (let index = 0; index < uniqueIncoming.length; index += 1) {
        const idValue = getIdValue(uniqueIncoming[index]);
        await logItemReport(client, {
          productId,
          itemId: idValue,
          type: "buy",
          quantity: 1,
          buyPrice: unitPrice,
          sellPrice: null,
          price: unitPrice,
          profit: 0,
          remainingStock: product.stock + index + 1,
        });
      }

      await logTransaction(client, productId, "buy", purchaseAmount);
      await client.query("COMMIT");
      return res.json({ ok: true });
    }

    const quantity = Number(quantityRaw);

    if (!Number.isInteger(quantity) || quantity <= 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "quantity must be a positive integer" });
    }

    const newStock = product.stock + quantity;
    const purchaseAmount = unitPrice * quantity;

    await applyFinanceEntry(client, {
      accountType: paymentSource,
      direction: paymentSource === "balance" ? "out" : "in",
      amount: purchaseAmount,
      note: `Buy quantity for product #${productId}`,
      source: paymentSource === "balance" ? "buy-balance" : "buy-credit",
      referenceType: "product",
      referenceId: productId,
    });

    await client.query(
      `UPDATE products SET stock = $1, updated_at = NOW() WHERE id = $2`,
      [newStock, productId]
    );

    await logItemReport(client, {
      productId,
      itemId: null,
      type: "buy",
      quantity,
      buyPrice: unitPrice,
      sellPrice: null,
      price: unitPrice,
      profit: 0,
      remainingStock: newStock,
    });

    await logTransaction(client, productId, "buy", purchaseAmount);
    await client.query("COMMIT");

    return res.json({ ok: true });
  } catch (_error) {
    await client.query("ROLLBACK");
    return res.status(500).json({ error: "Failed to process buy" });
  } finally {
    client.release();
  }
}

async function sellProduct(req, res) {
  const productId = Number(req.params.id);
  const {
    quantity: quantityRaw,
    item_id: itemIdRaw,
    item_ids: itemIdsRaw,
    price: priceRaw,
  } = req.body || {};

  if (!Number.isInteger(productId)) {
    return res.status(400).json({ error: "Invalid product id" });
  }

  const client = await getPool().connect();

  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `SELECT id, stock, default_price, ids FROM products WHERE id = $1 FOR UPDATE`,
      [productId]
    );

    if (!rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Product not found" });
    }

    const product = rows[0];
    const currentIds = normalizeStoredIds(product.ids, parseNumeric(product.default_price, 0));

    if (product.stock <= 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "stock = 0, cannot sell" });
    }

    const unitPrice = parseNumeric(priceRaw, parseNumeric(product.default_price, 0));
    const currentValues = currentIds.map(getIdValue);
    const singleInput = itemIdRaw ? String(itemIdRaw).trim() : "";
    const fromSingle = singleInput
      ? singleInput
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean)
      : [];
    const fromArray = Array.isArray(itemIdsRaw)
      ? itemIdsRaw.map((value) => String(value || "").trim()).filter(Boolean)
      : [];
    const requestedIds = [...fromArray, ...fromSingle];

    if (requestedIds.length > 0) {
      const uniqueRequested = [...new Set(requestedIds)];

      if (uniqueRequested.length !== requestedIds.length) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Duplicate IDs in sell request are not allowed" });
      }

      const missingId = uniqueRequested.find((value) => !currentValues.includes(value));

      if (missingId) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: `ID not found: ${missingId}` });
      }

      const removeSet = new Set(uniqueRequested);
      const nextIds = currentIds.filter((item) => !removeSet.has(getIdValue(item)));
      const soldCount = uniqueRequested.length;
      const newStock = product.stock - soldCount;
      const saleAmount = unitPrice * soldCount;

      if (newStock < 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Not enough stock" });
      }

      await client.query(
        `UPDATE products SET stock = $1, ids = $2::jsonb, updated_at = NOW() WHERE id = $3`,
        [newStock, JSON.stringify(nextIds), productId]
      );

      await applyFinanceEntry(client, {
        accountType: "balance",
        direction: "in",
        amount: saleAmount,
        note: `Sell tracked IDs for product #${productId}`,
        source: "sell",
        referenceType: "product",
        referenceId: productId,
      });

      for (let index = 0; index < uniqueRequested.length; index += 1) {
        const soldId = uniqueRequested[index];
        const matchedItem = currentIds.find((item) => getIdValue(item) === soldId);
        const buyPrice = parseNumeric(matchedItem?.buy_price, parseNumeric(product.default_price, 0));
        await logItemReport(client, {
          productId,
          itemId: soldId,
          type: "sell",
          quantity: 1,
          buyPrice,
          sellPrice: unitPrice,
          price: unitPrice,
          profit: unitPrice - buyPrice,
          remainingStock: product.stock - (index + 1),
        });
      }

      await logTransaction(client, productId, "sell", saleAmount);
      await client.query("COMMIT");
      return res.json({ ok: true });
    }

    if (currentIds.length > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Tracked products must be sold with an Item ID" });
    }

    const quantity = Number(quantityRaw);

    if (!Number.isInteger(quantity) || quantity <= 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "quantity must be a positive integer" });
    }

    if (quantity > product.stock) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Not enough stock" });
    }

    const newStock = product.stock - quantity;
    const saleAmount = unitPrice * quantity;

    await client.query(
      `UPDATE products SET stock = $1, updated_at = NOW() WHERE id = $2`,
      [newStock, productId]
    );

    await applyFinanceEntry(client, {
      accountType: "balance",
      direction: "in",
      amount: saleAmount,
      note: `Sell quantity for product #${productId}`,
      source: "sell",
      referenceType: "product",
      referenceId: productId,
    });

    await logItemReport(client, {
      productId,
      itemId: null,
      type: "sell",
      quantity,
      buyPrice: 0,
      sellPrice: unitPrice,
      price: unitPrice,
      profit: 0,
      remainingStock: newStock,
    });

    await logTransaction(client, productId, "sell", saleAmount);
    await client.query("COMMIT");
    return res.json({ ok: true });
  } catch (_error) {
    await client.query("ROLLBACK");
    return res.status(500).json({ error: "Failed to process sell" });
  } finally {
    client.release();
  }
}

module.exports = {
  buyProduct,
  createProduct,
  deleteProduct,
  getProducts,
  sellProduct,
};