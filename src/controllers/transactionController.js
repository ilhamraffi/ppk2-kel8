const { query } = require('../config/db');

/**
 * Helper to validate date string (YYYY-MM-DD)
 */
const isValidDate = (dateStr) => {
  if (typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return false;
  }
  const dateObj = new Date(dateStr);
  return !isNaN(dateObj.getTime()) && dateObj.toISOString().slice(0, 10) === dateStr;
};

/**
 * Format a database transaction row for JSON response
 */
const formatTransaction = (row) => ({
  id: row.id,
  user_id: row.user_id,
  type: row.type,
  amount: Number(row.amount),
  description: row.description,
  date: row.date,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

/**
 * GET /api/transactions
 * Retrieve all transactions for the authenticated user.
 * Optional query parameter: ?type=income or ?type=expense
 */
const getTransactions = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type } = req.query;

    let queryText = `
      SELECT id, user_id, type, amount, description, TO_CHAR(date, 'YYYY-MM-DD') AS date, created_at, updated_at
      FROM transactions
      WHERE user_id = $1
    `;
    const queryParams = [userId];

    if (type !== undefined) {
      if (type !== 'income' && type !== 'expense') {
        return res.status(400).json({
          error: "Invalid type filter. Must be 'income' or 'expense'",
        });
      }
      queryText += ' AND type = $2';
      queryParams.push(type);
    }

    queryText += ' ORDER BY date DESC, id DESC';

    const result = await query(queryText, queryParams);
    const transactions = result.rows.map(formatTransaction);

    return res.status(200).json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/transactions/:id
 * Retrieve a single transaction by ID for the authenticated user.
 */
const getTransactionById = async (req, res) => {
  try {
    const userId = req.user.id;
    const id = parseInt(req.params.id, 10);

    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid transaction ID' });
    }

    const checkResult = await query('SELECT * FROM transactions WHERE id = $1', [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const transaction = checkResult.rows[0];

    // Authorization check
    if (transaction.user_id !== userId) {
      return res.status(403).json({
        error: 'Forbidden: You do not have access to this transaction',
      });
    }

    const result = await query(
      `SELECT id, user_id, type, amount, description, TO_CHAR(date, 'YYYY-MM-DD') AS date, created_at, updated_at
       FROM transactions WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    return res.status(200).json(formatTransaction(result.rows[0]));
  } catch (error) {
    console.error('Error fetching transaction by id:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * POST /api/transactions
 * Create a new transaction.
 * Request body: { type, amount, description, date }
 * user_id is strictly derived from req.user.id (server-side session context).
 */
const createTransaction = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, amount, description, date } = req.body;

    // Validate type
    if (!type || (type !== 'income' && type !== 'expense')) {
      return res.status(400).json({
        error: "Invalid or missing 'type'. Must be either 'income' or 'expense'",
      });
    }

    // Validate amount
    const parsedAmount = typeof amount === 'number' ? amount : parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        error: "'amount' must be a valid positive number greater than 0",
      });
    }

    // Validate date
    if (!date || !isValidDate(date)) {
      return res.status(400).json({
        error: "Invalid or missing 'date'. Must be a valid date in YYYY-MM-DD format",
      });
    }

    const cleanDescription = description ? String(description).trim() : null;

    const result = await query(
      `INSERT INTO transactions (user_id, type, amount, description, date)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, user_id, type, amount, description, TO_CHAR(date, 'YYYY-MM-DD') AS date, created_at, updated_at`,
      [userId, type, parsedAmount, cleanDescription, date]
    );

    return res.status(201).json(formatTransaction(result.rows[0]));
  } catch (error) {
    console.error('Error creating transaction:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * PUT /api/transactions/:id
 * Update an existing transaction.
 * Authorization: Only the owner can update.
 */
const updateTransaction = async (req, res) => {
  try {
    const userId = req.user.id;
    const id = parseInt(req.params.id, 10);

    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid transaction ID' });
    }

    // First check transaction existence and ownership
    const checkResult = await query('SELECT * FROM transactions WHERE id = $1', [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const existing = checkResult.rows[0];

    // Authorization check
    if (existing.user_id !== userId) {
      return res.status(403).json({
        error: 'Forbidden: You do not have access to this transaction',
      });
    }

    const { type, amount, description, date } = req.body;

    // Validate type if provided
    let newType = existing.type;
    if (type !== undefined) {
      if (type !== 'income' && type !== 'expense') {
        return res.status(400).json({
          error: "Invalid 'type'. Must be either 'income' or 'expense'",
        });
      }
      newType = type;
    }

    // Validate amount if provided
    let newAmount = existing.amount;
    if (amount !== undefined) {
      const parsedAmount = typeof amount === 'number' ? amount : parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({
          error: "'amount' must be a valid positive number greater than 0",
        });
      }
      newAmount = parsedAmount;
    }

    // Validate date if provided
    let newDate = existing.date;
    if (date !== undefined) {
      if (!isValidDate(date)) {
        return res.status(400).json({
          error: "Invalid 'date'. Must be a valid date in YYYY-MM-DD format",
        });
      }
      newDate = date;
    }

    const newDescription = description !== undefined
      ? (description ? String(description).trim() : null)
      : existing.description;

    const result = await query(
      `UPDATE transactions
       SET type = $1, amount = $2, description = $3, date = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 AND user_id = $6
       RETURNING id, user_id, type, amount, description, TO_CHAR(date, 'YYYY-MM-DD') AS date, created_at, updated_at`,
      [newType, newAmount, newDescription, newDate, id, userId]
    );

    return res.status(200).json(formatTransaction(result.rows[0]));
  } catch (error) {
    console.error('Error updating transaction:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * DELETE /api/transactions/:id
 * Delete an existing transaction.
 * Authorization: Only the owner can delete.
 */
const deleteTransaction = async (req, res) => {
  try {
    const userId = req.user.id;
    const id = parseInt(req.params.id, 10);

    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid transaction ID' });
    }

    // First check transaction existence and ownership
    const checkResult = await query('SELECT * FROM transactions WHERE id = $1', [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const existing = checkResult.rows[0];

    // Authorization check
    if (existing.user_id !== userId) {
      return res.status(403).json({
        error: 'Forbidden: You do not have access to this transaction',
      });
    }

    await query('DELETE FROM transactions WHERE id = $1 AND user_id = $2', [id, userId]);

    return res.status(200).json({
      message: 'Transaction deleted successfully',
      id,
    });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
};

