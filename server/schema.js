const { pool } = require("./db");

async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
      default_price NUMERIC(12, 2) NOT NULL CHECK (default_price >= 0),
      ids JSONB NOT NULL DEFAULT '[]'::jsonb,
      image_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const idsColumn = await pool.query(`
    SELECT data_type
    FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'ids'
    LIMIT 1
  `);

  if (idsColumn.rows[0]?.data_type !== 'jsonb') {
    await pool.query(`ALTER TABLE products ALTER COLUMN ids DROP DEFAULT;`);
    await pool.query(`ALTER TABLE products ALTER COLUMN ids TYPE JSONB USING to_jsonb(ids);`);
  }

  await pool.query(`
    UPDATE products
    SET ids = COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id',
            CASE
              WHEN jsonb_typeof(item) = 'object' THEN item->>'id'
              ELSE item #>> '{}'
            END,
            'buy_price',
            COALESCE(
              NULLIF(
                CASE
                  WHEN jsonb_typeof(item) = 'object' THEN item->>'buy_price'
                  ELSE NULL
                END,
                ''
              )::numeric,
              default_price
            )
          )
        )
        FROM jsonb_array_elements(COALESCE(ids, '[]'::jsonb)) AS item
      ),
      '[]'::jsonb
    )
    WHERE jsonb_array_length(COALESCE(ids, '[]'::jsonb)) > 0;
  `);

  await pool.query(`
    ALTER TABLE products
    ALTER COLUMN ids SET DEFAULT '[]'::jsonb;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS item_reports (
      id SERIAL PRIMARY KEY,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      item_id TEXT,
      type TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      buy_price NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (buy_price >= 0),
      sell_price NUMERIC(12, 2),
      price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
      profit NUMERIC(12, 2) NOT NULL DEFAULT 0,
      remaining_stock INTEGER NOT NULL CHECK (remaining_stock >= 0),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`ALTER TABLE item_reports ADD COLUMN IF NOT EXISTS buy_price NUMERIC(12, 2) NOT NULL DEFAULT 0;`);
  await pool.query(`ALTER TABLE item_reports ADD COLUMN IF NOT EXISTS sell_price NUMERIC(12, 2);`);
  await pool.query(`ALTER TABLE item_reports ADD COLUMN IF NOT EXISTS profit NUMERIC(12, 2) NOT NULL DEFAULT 0;`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
      amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS finance_accounts (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      balance NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
      credit NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (credit >= 0),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    INSERT INTO finance_accounts (id, balance, credit)
    VALUES (1, 0, 0)
    ON CONFLICT (id) DO NOTHING;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS finance_reports (
      id SERIAL PRIMARY KEY,
      account_type TEXT NOT NULL CHECK (account_type IN ('balance', 'credit')),
      direction TEXT NOT NULL CHECK (direction IN ('in', 'out')),
      amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
      supplier_name TEXT,
      note TEXT,
      source TEXT,
      reference_type TEXT,
      reference_id INTEGER,
      balance_after NUMERIC(14, 2) NOT NULL CHECK (balance_after >= 0),
      credit_after NUMERIC(14, 2) NOT NULL CHECK (credit_after >= 0),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`ALTER TABLE finance_reports ADD COLUMN IF NOT EXISTS supplier_name TEXT;`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS supplier_credits (
      id SERIAL PRIMARY KEY,
      supplier_name TEXT NOT NULL UNIQUE,
      amount NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_item_reports_product_id ON item_reports(product_id);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_item_reports_created_at ON item_reports(created_at);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_finance_reports_created_at ON finance_reports(created_at);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_finance_reports_supplier_name ON finance_reports(supplier_name);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_supplier_credits_supplier_name ON supplier_credits(supplier_name);
  `);

  await pool.query(`
    INSERT INTO supplier_credits (supplier_name, amount)
    SELECT 'Legacy Credit', credit
    FROM finance_accounts
    WHERE id = 1
      AND credit > 0
      AND NOT EXISTS (SELECT 1 FROM supplier_credits)
    ON CONFLICT (supplier_name) DO NOTHING;
  `);
}

module.exports = { initSchema };
