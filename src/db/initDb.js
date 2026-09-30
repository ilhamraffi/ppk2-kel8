const { query } = require('../config/db');

const initDb = async () => {
  const createUsersTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createTransactionsTableQuery = `
    CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
      amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
      category VARCHAR(100),
      description TEXT,
      date DATE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date);
  `;

  // CREATE TABLE IF NOT EXISTS is a no-op when the table already exists, so the
  // category column has to be backfilled separately for databases created before
  // it was introduced. This keeps initDb idempotent across old and fresh setups.
  const addTransactionCategoryQuery = `
    ALTER TABLE transactions ADD COLUMN IF NOT EXISTS category VARCHAR(100);
  `;

  const createBudgetsTableQuery = `
    CREATE TABLE IF NOT EXISTS budgets (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      month VARCHAR(7) NOT NULL,
      amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT unique_user_monthly_budget UNIQUE (user_id, month)
    );
    CREATE INDEX IF NOT EXISTS idx_budgets_user_month ON budgets(user_id, month);
  `;

  await query(createUsersTableQuery);
  await query(createTransactionsTableQuery);
  await query(addTransactionCategoryQuery);
  await query(createBudgetsTableQuery);
};

module.exports = { initDb };

