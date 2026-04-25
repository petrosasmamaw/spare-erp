const { getPool, getRangeClause } = require("./erpHelpers");

async function getTransactions(req, res) {
  const range = String(req.query.range || "all");
  const rangeClause = getRangeClause(range);

  try {
    const { rows } = await getPool().query(
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
  } catch (_error) {
    res.status(500).json({ error: "Failed to load transactions" });
  }
}

module.exports = { getTransactions };