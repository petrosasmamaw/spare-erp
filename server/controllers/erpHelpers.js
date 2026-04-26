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

async function ensureFinanceAccountRow(client) {
  await client.query(
    `
      INSERT INTO finance_accounts (id, balance, credit)
      VALUES (1, 0, 0)
      ON CONFLICT (id) DO NOTHING
    `
  );
}

async function applyFinanceEntry(
  client,
  { accountType, direction, amount, note, source, referenceType, referenceId }
) {
  await ensureFinanceAccountRow(client);

  const { rows } = await client.query(
    `SELECT balance, credit FROM finance_accounts WHERE id = 1 FOR UPDATE`
  );

  const currentBalance = Number(rows[0]?.balance || 0);
  const currentCredit = Number(rows[0]?.credit || 0);
  let nextBalance = currentBalance;
  let nextCredit = currentCredit;

  if (accountType === "balance") {
    if (direction === "in") {
      nextBalance += amount;
    } else {
      if (currentBalance < amount) {
        throw new Error("Insufficient balance");
      }
      nextBalance -= amount;
    }
  } else if (accountType === "credit") {
    if (direction === "in") {
      nextCredit += amount;
    } else {
      if (currentCredit < amount) {
        throw new Error("Credit repayment exceeds current credit");
      }
      nextCredit -= amount;
    }
  } else {
    throw new Error("Invalid account type");
  }

  await client.query(
    `
      UPDATE finance_accounts
      SET balance = $1, credit = $2, updated_at = NOW()
      WHERE id = 1
    `,
    [nextBalance, nextCredit]
  );

  await client.query(
    `
      INSERT INTO finance_reports (
        account_type,
        direction,
        amount,
        note,
        source,
        reference_type,
        reference_id,
        balance_after,
        credit_after
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `,
    [
      accountType,
      direction,
      amount,
      note || null,
      source || null,
      referenceType || null,
      referenceId || null,
      nextBalance,
      nextCredit,
    ]
  );

  return { balance: nextBalance, credit: nextCredit };
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
  applyFinanceEntry,
  getPool,
  getRangeClause,
  logItemReport,
  logTransaction,
  parseNumeric,
};