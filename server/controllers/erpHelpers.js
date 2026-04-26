const { pool } = require("../db");
const { toEthiopian } = require("ethiopian-date");

function getCurrentEthiopianDate() {
  const now = new Date();
  const [year, month, day] = toEthiopian(
    now.getFullYear(),
    now.getMonth() + 1,
    now.getDate()
  );

  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

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
  const ethiopianDate = getCurrentEthiopianDate();
  await client.query(
    `
      INSERT INTO transactions (product_id, type, amount, ethiopian_date)
      VALUES ($1, $2, $3, $4)
    `,
    [productId, type, amount, ethiopianDate]
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
  { accountType, direction, amount, note, source, referenceType, referenceId, supplierName }
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
    const normalizedSupplier = String(supplierName || "").trim();

    if (!normalizedSupplier) {
      throw new Error("Supplier name is required for credit entries");
    }

    if (direction === "in") {
      await client.query(
        `
          INSERT INTO supplier_credits (supplier_name, amount, updated_at)
          VALUES ($1, $2, NOW())
          ON CONFLICT (supplier_name)
          DO UPDATE SET amount = supplier_credits.amount + EXCLUDED.amount, updated_at = NOW()
        `,
        [normalizedSupplier, amount]
      );
      nextCredit += amount;
    } else {
      const supplierResult = await client.query(
        `SELECT amount FROM supplier_credits WHERE supplier_name = $1 FOR UPDATE`,
        [normalizedSupplier]
      );

      const currentSupplierCredit = Number(supplierResult.rows[0]?.amount || 0);

      if (currentSupplierCredit < amount) {
        throw new Error("Credit repayment exceeds supplier credit");
      }

      const nextSupplierCredit = currentSupplierCredit - amount;

      if (nextSupplierCredit === 0) {
        await client.query(`DELETE FROM supplier_credits WHERE supplier_name = $1`, [normalizedSupplier]);
      } else {
        await client.query(
          `UPDATE supplier_credits SET amount = $1, updated_at = NOW() WHERE supplier_name = $2`,
          [nextSupplierCredit, normalizedSupplier]
        );
      }

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

  const ethiopianDate = getCurrentEthiopianDate();

  await client.query(
    `
      INSERT INTO finance_reports (
        account_type,
        direction,
        amount,
        ethiopian_date,
        supplier_name,
        note,
        source,
        reference_type,
        reference_id,
        balance_after,
        credit_after
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `,
    [
      accountType,
      direction,
      amount,
      ethiopianDate,
      accountType === "credit" ? String(supplierName || "").trim() : null,
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