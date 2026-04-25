const { getPool, logItemReport, logTransaction, parseNumeric } = require("./erpHelpers");

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
  const ids = Array.isArray(idsRaw) ? idsRaw.map((value) => String(value).trim()).filter(Boolean) : [];
  const uniqueIds = [...new Set(ids)];

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
    const { rows } = await getPool().query(
      `
        INSERT INTO products (name, category, stock, default_price, ids, image_url)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, name, category, stock, default_price, ids, image_url
      `,
      [name.trim(), category.trim(), stock, defaultPrice, uniqueIds, imageUrl || null]
    );

    return res.status(201).json(rows[0]);
  } catch (_error) {
    return res.status(500).json({ error: "Failed to create product" });
  }
}

async function buyProduct(req, res) {
  const productId = Number(req.params.id);
  const { quantity: quantityRaw, ids: idsRaw, price: priceRaw } = req.body || {};

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
    const currentIds = Array.isArray(product.ids) ? product.ids : [];
    const trackedBuyIds = Array.isArray(idsRaw)
      ? idsRaw.map((value) => String(value).trim()).filter(Boolean)
      : [];

    const uniqueIncoming = [...new Set(trackedBuyIds)];

    if (trackedBuyIds.length !== uniqueIncoming.length) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Duplicate incoming IDs are not allowed" });
    }

    const duplicateExisting = uniqueIncoming.find((idValue) => currentIds.includes(idValue));

    if (duplicateExisting) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: `Duplicate ID: ${duplicateExisting}` });
    }

    const unitPrice = parseNumeric(priceRaw, parseNumeric(product.default_price, 0));

    if (trackedBuyIds.length > 0) {
      const newIds = [...currentIds, ...uniqueIncoming];
      const newStock = product.stock + uniqueIncoming.length;

      await client.query(
        `UPDATE products SET stock = $1, ids = $2, updated_at = NOW() WHERE id = $3`,
        [newStock, newIds, productId]
      );

      for (let index = 0; index < uniqueIncoming.length; index += 1) {
        await logItemReport(client, {
          productId,
          itemId: uniqueIncoming[index],
          type: "buy",
          quantity: 1,
          price: unitPrice,
          remainingStock: product.stock + index + 1,
        });
      }

      await logTransaction(client, productId, "buy", unitPrice * uniqueIncoming.length);
      await client.query("COMMIT");
      return res.json({ ok: true });
    }

    const quantity = Number(quantityRaw);

    if (!Number.isInteger(quantity) || quantity <= 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "quantity must be a positive integer" });
    }

    const newStock = product.stock + quantity;

    await client.query(
      `UPDATE products SET stock = $1, updated_at = NOW() WHERE id = $2`,
      [newStock, productId]
    );

    await logItemReport(client, {
      productId,
      itemId: null,
      type: "buy",
      quantity,
      price: unitPrice,
      remainingStock: newStock,
    });

    await logTransaction(client, productId, "buy", unitPrice * quantity);
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
  const { quantity: quantityRaw, item_id: itemIdRaw, price: priceRaw } = req.body || {};

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
    const currentIds = Array.isArray(product.ids) ? product.ids : [];

    if (product.stock <= 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "stock = 0, cannot sell" });
    }

    const unitPrice = parseNumeric(priceRaw, parseNumeric(product.default_price, 0));
    const itemId = itemIdRaw ? String(itemIdRaw).trim() : "";

    if (itemId) {
      if (!currentIds.includes(itemId)) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "ID not found" });
      }

      const nextIds = currentIds.filter((value) => value !== itemId);
      const newStock = product.stock - 1;

      await client.query(
        `UPDATE products SET stock = $1, ids = $2, updated_at = NOW() WHERE id = $3`,
        [newStock, nextIds, productId]
      );

      await logItemReport(client, {
        productId,
        itemId,
        type: "sell",
        quantity: 1,
        price: unitPrice,
        remainingStock: newStock,
      });

      await logTransaction(client, productId, "sell", unitPrice);
      await client.query("COMMIT");
      return res.json({ ok: true });
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

    await client.query(
      `UPDATE products SET stock = $1, updated_at = NOW() WHERE id = $2`,
      [newStock, productId]
    );

    await logItemReport(client, {
      productId,
      itemId: null,
      type: "sell",
      quantity,
      price: unitPrice,
      remainingStock: newStock,
    });

    await logTransaction(client, productId, "sell", unitPrice * quantity);
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
  getProducts,
  sellProduct,
};