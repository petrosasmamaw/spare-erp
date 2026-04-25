require("dotenv").config({ path: ".env.local" });

const express = require("express");
const cors = require("cors");
const { pool } = require("./db");
const { initSchema } = require("./schema");

const app = express();
const port = Number(process.env.API_PORT || 4000);

app.use(cors());
app.use(express.json());

function parseNumeric(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    return fallback;
  }
  return n;
}

function getRangeClause(range) {
  if (range === "today") {
    return "AND created_at::date = CURRENT_DATE";
  }

  if (range === "7d") {
    return "AND created_at >= NOW() - INTERVAL '7 days'";
  }

  if (range === "30d") {
    return "AND created_at >= NOW() - INTERVAL '30 days'";
  }

  return "";
}

async function logTransaction(client, productId, type, amount) {
  await client.query(
    `INSERT INTO transactions (product_id, type, amount) VALUES ($1, $2, $3)`,
    [productId, type, amount]
  );
}

async function logItemReport(client, {
  productId,
  itemId,
  type,
  quantity,
  price,
  remainingStock,
}) {
  await client.query(
    `
      INSERT INTO item_reports (product_id, item_id, type, quantity, price, remaining_stock)
      VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [productId, itemId || null, type, quantity, price, remainingStock]
  );
}

app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: "Database not reachable" });
  }
});

app.get("/api/products", async (req, res) => {
  try {
    const search = String(req.query.search || "").trim();
    const values = [];
    let where = "";

    if (search) {
      values.push(`%${search}%`);
      where = "WHERE name ILIKE $1 OR category ILIKE $1";
    }

    const { rows } = await pool.query(
      `
        SELECT id, name, category, stock, default_price, ids, image_url
        FROM products
        ${where}
        ORDER BY id DESC
      `,
      values
    );

    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to load products" });
  }
});

app.post("/api/products", async (req, res) => {
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
  const ids = Array.isArray(idsRaw) ? idsRaw.map((v) => String(v).trim()).filter(Boolean) : [];
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
    const { rows } = await pool.query(
      `
        INSERT INTO products (name, category, stock, default_price, ids, image_url)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, name, category, stock, default_price, ids, image_url
      `,
      [name.trim(), category.trim(), stock, defaultPrice, uniqueIds, imageUrl || null]
    );

    return res.status(201).json(rows[0]);
  } catch (error) {
    return res.status(500).json({ error: "Failed to create product" });
  }
});

app.post("/api/products/:id/buy", async (req, res) => {
  const productId = Number(req.params.id);
  const { quantity: quantityRaw, ids: idsRaw, price: priceRaw } = req.body || {};

  if (!Number.isInteger(productId)) {
    return res.status(400).json({ error: "Invalid product id" });
  }

  const client = await pool.connect();

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
      ? idsRaw.map((v) => String(v).trim()).filter(Boolean)
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

      for (let i = 0; i < uniqueIncoming.length; i += 1) {
        await logItemReport(client, {
          productId,
          itemId: uniqueIncoming[i],
          type: "buy",
          quantity: 1,
          price: unitPrice,
          remainingStock: product.stock + i + 1,
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
  } catch (error) {
    await client.query("ROLLBACK");
    return res.status(500).json({ error: "Failed to process buy" });
  } finally {
    client.release();
  }
});

app.post("/api/products/:id/sell", async (req, res) => {
  const productId = Number(req.params.id);
  const { quantity: quantityRaw, item_id: itemIdRaw, price: priceRaw } = req.body || {};

  if (!Number.isInteger(productId)) {
    return res.status(400).json({ error: "Invalid product id" });
  }

  const client = await pool.connect();

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

      const nextIds = currentIds.filter((v) => v !== itemId);
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
  } catch (error) {
    await client.query("ROLLBACK");
    return res.status(500).json({ error: "Failed to process sell" });
  } finally {
    client.release();
  }
});

app.get("/api/item-reports", async (req, res) => {
  const productId = Number(req.query.productId);
  const range = String(req.query.range || "all");

  const values = [];
  const conditions = [];

  if (Number.isInteger(productId) && productId > 0) {
    values.push(productId);
    conditions.push(`ir.product_id = $${values.length}`);
  }

  const rangeClause = getRangeClause(range);
  if (rangeClause) {
    conditions.push(rangeClause.replace(/^AND\s+/, ""));
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  try {
    const { rows } = await pool.query(
      `
        SELECT
          ir.id,
          ir.product_id,
          p.name AS product_name,
          ir.item_id,
          ir.type,
          ir.quantity,
          ir.price,
          ir.remaining_stock,
          ir.created_at
        FROM item_reports ir
        JOIN products p ON p.id = ir.product_id
        ${whereClause}
        ORDER BY ir.created_at DESC
        LIMIT 500
      `,
      values
    );

    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to load item reports" });
  }
});

app.get("/api/dashboard", async (req, res) => {
  const range = String(req.query.range || "all");
  const rangeClause = getRangeClause(range);

  try {
    const salesResult = await pool.query(
      `
        SELECT COALESCE(SUM(amount), 0) AS total_sales
        FROM transactions
        WHERE type = 'sell' ${rangeClause}
      `
    );

    const purchaseResult = await pool.query(
      `
        SELECT COALESCE(SUM(amount), 0) AS total_purchases
        FROM transactions
        WHERE type = 'buy' ${rangeClause}
      `
    );

    const stockResult = await pool.query(
      `SELECT COALESCE(SUM(stock), 0) AS current_stock FROM products`
    );

    const totalSales = Number(salesResult.rows[0].total_sales || 0);
    const totalPurchases = Number(purchaseResult.rows[0].total_purchases || 0);

    res.json({
      totalSales,
      totalPurchases,
      profit: totalSales - totalPurchases,
      currentStock: Number(stockResult.rows[0].current_stock || 0),
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to load dashboard" });
  }
});

app.get("/api/transactions", async (req, res) => {
  const range = String(req.query.range || "all");
  const rangeClause = getRangeClause(range);

  try {
    const { rows } = await pool.query(
      `
        SELECT
          t.id,
          t.product_id,
          p.name AS product_name,
          t.type,
          t.amount,
          t.created_at
        FROM transactions t
        JOIN products p ON p.id = t.product_id
        WHERE 1 = 1 ${rangeClause}
        ORDER BY t.created_at DESC
        LIMIT 300
      `
    );

    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to load transactions" });
  }
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

async function start() {
  try {
    await initSchema();
    app.listen(port, () => {
      console.log(`API running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Failed to initialize API", error);
    process.exit(1);
  }
}

start();
