const { pool } = require("./db");

async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
      default_price NUMERIC(12, 2) NOT NULL CHECK (default_price >= 0),
      ids TEXT[] NOT NULL DEFAULT '{}',
      image_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS item_reports (
      id SERIAL PRIMARY KEY,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      item_id TEXT,
      type TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
      remaining_stock INTEGER NOT NULL CHECK (remaining_stock >= 0),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

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
    CREATE INDEX IF NOT EXISTS idx_item_reports_product_id ON item_reports(product_id);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_item_reports_created_at ON item_reports(created_at);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
  `);
}

module.exports = { initSchema };
