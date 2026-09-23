const { query } = require('../config/db');

/**
 * GET /api/dashboard
 * Aggregates financial totals (balance, total_income, total_expense)
 * strictly for the authenticated user.
 */
const getDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    const aggregationQuery = `
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS total_expense
      FROM transactions
      WHERE user_id = $1
    `;

    const result = await query(aggregationQuery, [userId]);
    const total_income = Number(result.rows[0].total_income);
    const total_expense = Number(result.rows[0].total_expense);
    const balance = total_income - total_expense;

    return res.status(200).json({
      balance,
      total_income,
      total_expense,
    });
  } catch (error) {
    console.error('Dashboard aggregation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getDashboard,
};

