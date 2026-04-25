const { getPool, getRangeClause } = require("./erpHelpers");

async function getDashboard(req, res) {
  const range = String(req.query.range || "all");
  const rangeClause = getRangeClause(range);

  try {
    const salesResult = await getPool().query(
      `
        SELECT COALESCE(SUM(amount), 0) AS total_sales
        FROM transactions
        WHERE type = 'sell' ${rangeClause}
      `
    );

    const purchaseResult = await getPool().query(
      `
        SELECT COALESCE(SUM(amount), 0) AS total_purchases
        FROM transactions
        WHERE type = 'buy' ${rangeClause}
      `
    );

    const stockResult = await getPool().query(
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
  } catch (_error) {
    res.status(500).json({ error: "Failed to load dashboard" });
  }
}

module.exports = { getDashboard };