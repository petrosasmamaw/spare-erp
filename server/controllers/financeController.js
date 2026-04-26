const { applyFinanceEntry, getPool, getRangeClause, parseNumeric } = require("./erpHelpers");

async function getFinanceSummary(_req, res) {
  try {
    const accountResult = await getPool().query(
      `
        SELECT balance, credit
        FROM finance_accounts
        WHERE id = 1
      `
    );

    const profitResult = await getPool().query(
      `
        SELECT COALESCE(SUM(profit), 0) AS total_profit
        FROM item_reports
        WHERE type = 'sell'
      `
    );

    const stockValueResult = await getPool().query(
      `
        SELECT COALESCE(SUM(product_value), 0) AS stock_value
        FROM (
          SELECT
            CASE
              WHEN jsonb_array_length(COALESCE(ids, '[]'::jsonb)) > 0 THEN (
                SELECT COALESCE(SUM(COALESCE(NULLIF(item->>'buy_price', '')::numeric, default_price)), 0)
                FROM jsonb_array_elements(COALESCE(ids, '[]'::jsonb)) AS item
              )
              ELSE stock * default_price
            END AS product_value
          FROM products
        ) v
      `
    );

    const account = accountResult.rows[0] || { balance: 0, credit: 0 };

    res.json({
      balance: Number(account.balance || 0),
      credit: Number(account.credit || 0),
      profit: Number(profitResult.rows[0]?.total_profit || 0),
      stockValue: Number(stockValueResult.rows[0]?.stock_value || 0),
    });
  } catch (_error) {
    res.status(500).json({ error: "Failed to load finance summary" });
  }
}

async function getFinanceReports(req, res) {
  const range = String(req.query.range || "all");
  const account = String(req.query.account || "").trim().toLowerCase();
  const values = [];
  const conditions = [];

  if (account === "balance" || account === "credit") {
    values.push(account);
    conditions.push(`account_type = $${values.length}`);
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
          id,
          account_type,
          direction,
          amount,
            supplier_name,
          note,
          source,
          reference_type,
          reference_id,
          balance_after,
          credit_after,
          created_at
        FROM finance_reports
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT 500
      `,
      values
    );

    res.json(rows);
  } catch (_error) {
    res.status(500).json({ error: "Failed to load finance reports" });
  }
}

async function createFinanceEntry(req, res) {
  const {
    account_type: accountTypeRaw,
    direction: directionRaw,
    amount: amountRaw,
    supplier_name: supplierNameRaw,
    note,
  } = req.body || {};

  const accountType = String(accountTypeRaw || "").trim().toLowerCase();
  const direction = String(directionRaw || "").trim().toLowerCase();
  const amount = parseNumeric(amountRaw, -1);

  if (accountType !== "balance" && accountType !== "credit") {
    return res.status(400).json({ error: "account_type must be balance or credit" });
  }

  if (direction !== "in" && direction !== "out") {
    return res.status(400).json({ error: "direction must be in or out" });
  }

  if (amount <= 0) {
    return res.status(400).json({ error: "amount must be > 0" });
  }

  const supplierName = supplierNameRaw ? String(supplierNameRaw).trim() : "";

  if (accountType === "credit" && !supplierName) {
    return res.status(400).json({ error: "supplier_name is required for credit entries" });
  }

  const client = await getPool().connect();

  try {
    await client.query("BEGIN");

    const summary = await applyFinanceEntry(client, {
      accountType,
      direction,
      amount,
      supplierName: accountType === "credit" ? supplierName : null,
      note: note ? String(note).trim() : null,
      source: "manual",
      referenceType: "manual",
      referenceId: null,
    });

    await client.query("COMMIT");
    return res.status(201).json({ ok: true, ...summary });
  } catch (error) {
    await client.query("ROLLBACK");
    return res.status(400).json({ error: error.message || "Failed to create finance entry" });
  } finally {
    client.release();
  }
}

async function getSupplierCredits(_req, res) {
  try {
    const { rows } = await getPool().query(
      `
        SELECT id, supplier_name, amount, updated_at
        FROM supplier_credits
        WHERE amount > 0
        ORDER BY amount DESC, supplier_name ASC
      `
    );

    res.json(rows);
  } catch (_error) {
    res.status(500).json({ error: "Failed to load supplier credits" });
  }
}

async function paySupplierCredit(req, res) {
  const {
    supplier_name: supplierNameRaw,
    amount: amountRaw,
    note,
  } = req.body || {};

  const supplierName = String(supplierNameRaw || "").trim();
  const amount = parseNumeric(amountRaw, -1);

  if (!supplierName) {
    return res.status(400).json({ error: "supplier_name is required" });
  }

  if (amount <= 0) {
    return res.status(400).json({ error: "amount must be > 0" });
  }

  const client = await getPool().connect();

  try {
    await client.query("BEGIN");

    await applyFinanceEntry(client, {
      accountType: "balance",
      direction: "out",
      amount,
      note: note ? String(note).trim() : `Pay credit to ${supplierName}`,
      source: "credit-payment",
      referenceType: "supplier",
      referenceId: null,
      supplierName: null,
    });

    const summary = await applyFinanceEntry(client, {
      accountType: "credit",
      direction: "out",
      amount,
      supplierName,
      note: note ? String(note).trim() : `Credit repayment to ${supplierName}`,
      source: "credit-payment",
      referenceType: "supplier",
      referenceId: null,
    });

    await client.query("COMMIT");
    return res.status(201).json({ ok: true, ...summary });
  } catch (error) {
    await client.query("ROLLBACK");
    return res.status(400).json({ error: error.message || "Failed to pay supplier credit" });
  } finally {
    client.release();
  }
}

module.exports = {
  createFinanceEntry,
  getFinanceReports,
  getFinanceSummary,
  getSupplierCredits,
  paySupplierCredit,
};
