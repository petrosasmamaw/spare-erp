const { getPool, getRangeClause } = require("./erpHelpers");

async function getItemReports(req, res) {
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
    const { rows } = await getPool().query(
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
  } catch (_error) {
    res.status(500).json({ error: "Failed to load item reports" });
  }
}

module.exports = { getItemReports };