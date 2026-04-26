const { pool } = require("../db");

function parseNumeric(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return parsed;
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

async function logItemReport(
  client,
  { productId, itemId, type, quantity, buyPrice, sellPrice, price, profit, remainingStock }
) {
  await client.query(
    `
      INSERT INTO item_reports (
        product_id,
        item_id,
        type,
        quantity,
        buy_price,
        sell_price,
        price,
        profit,
        remaining_stock
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `,
    [
      productId,
      itemId || null,
      type,
      quantity,
      buyPrice ?? null,
      sellPrice ?? null,
      price ?? null,
      profit ?? 0,
      remainingStock,
    ]
  );
}

function getPool() {
  return pool;
}

module.exports = {
  getPool,
  getRangeClause,
  logItemReport,
  logTransaction,
  parseNumeric,
};