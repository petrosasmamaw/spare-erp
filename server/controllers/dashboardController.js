const { getPool, getRangeClause } = require("./erpHelpers");

async function getDashboard(req, res) {
  const range = String(req.query.range || "all");
  const rangeClause = getRangeClause(range);

  try {
    const salesResult = await getPool().query(
      `
        SELECT COALESCE(SUM(sell_price), 0) AS total_sales
        FROM item_reports
        WHERE type = 'sell' ${rangeClause}
      `
    );

    const costResult = await getPool().query(
      `
        SELECT COALESCE(SUM(buy_price), 0) AS total_cost
        FROM item_reports
        WHERE type = 'buy' ${rangeClause}
      `
    );

    const profitResult = await getPool().query(
      `
        SELECT COALESCE(SUM(profit), 0) AS total_profit
        FROM item_reports
        WHERE type = 'sell' ${rangeClause}
      `
    );

    const stockResult = await getPool().query(
      `SELECT COALESCE(SUM(stock), 0) AS current_stock FROM products`
    );

    const totalSales = Number(salesResult.rows[0].total_sales || 0);
    const totalCost = Number(costResult.rows[0].total_cost || 0);
    const totalProfit = Number(profitResult.rows[0].total_profit || 0);

    res.json({
      totalSales,
      totalCost,
      totalPurchases: totalCost,
      profit: totalProfit,
      currentStock: Number(stockResult.rows[0].current_stock || 0),
    });
  } catch (_error) {
    res.status(500).json({ error: "Failed to load dashboard" });
  }
}

module.exports = { getDashboard };