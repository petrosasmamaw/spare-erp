const { getPool, getRangeClause } = require("./erpHelpers");
const { toEthiopian } = require("ethiopian-date");

function resolveEthiopianDate(row) {
  if (row.ethiopian_date) {
    return row.ethiopian_date;
  }

  if (!row.created_at) {
    return null;
  }

  const createdAt = new Date(row.created_at);
  const [year, month, day] = toEthiopian(
    createdAt.getFullYear(),
    createdAt.getMonth() + 1,
    createdAt.getDate()
  );

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

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
          t.ethiopian_date,
          t.created_at
        FROM transactions t
        JOIN products p ON p.id = t.product_id
        WHERE 1 = 1 ${rangeClause}
        ORDER BY t.created_at DESC
        LIMIT 300
      `
    );

    res.json(rows.map((row) => ({ ...row, ethiopian_date: resolveEthiopianDate(row) })));
  } catch (_error) {
    res.status(500).json({ error: "Failed to load transactions" });
  }
}

module.exports = { getTransactions };