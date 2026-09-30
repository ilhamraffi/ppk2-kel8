const { query } = require('../config/db');

/**
 * Set or update monthly budget
 * POST /api/budgets
 */
const setBudget = async (req, res) => {
  const userId = req.session.userId;
  const { month, amount } = req.body;

  if (!month || typeof month !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    return res.status(400).json({ success: false, error: 'Invalid month format (expected YYYY-MM)', code: 'INVALID_INPUT' });
  }

  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ success: false, error: 'Amount must be greater than 0', code: 'INVALID_INPUT' });
  }

  try {
    const result = await query(`
      INSERT INTO budgets (user_id, month, amount, updated_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, month)
      DO UPDATE SET amount = EXCLUDED.amount, updated_at = CURRENT_TIMESTAMP
      RETURNING id, user_id, month, amount, created_at, updated_at
    `, [userId, month, numAmount]);

    return res.status(200).json({
      success: true,
      message: 'Budget set successfully',
      budget: result.rows[0],
    });
  } catch (error) {
    console.error('Error setting budget:', error);
    return res.status(500).json({ success: false, error: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
  }
};

/**
 * Get monthly budget summary and indicator
 * GET /api/budgets
 */
const getMonthlyBudget = async (req, res) => {
  const userId = req.session.userId;
  const month = req.query.month || new Date().toISOString().slice(0, 7);

  if (typeof month !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    return res.status(400).json({ success: false, error: 'Invalid month format (expected YYYY-MM)', code: 'INVALID_INPUT' });
  }

  try {
    const budgetRes = await query(
      'SELECT id, amount FROM budgets WHERE user_id = $1 AND month = $2',
      [userId, month]
    );

    const expenseRes = await query(`
      SELECT COALESCE(SUM(amount), 0) AS total_expense
      FROM transactions
      WHERE user_id = $1 AND type = 'expense' AND TO_CHAR(date, 'YYYY-MM') = $2
    `, [userId, month]);

    const budgetAmount = budgetRes.rows.length ? parseFloat(budgetRes.rows[0].amount) : 0;
    const totalExpense = parseFloat(expenseRes.rows[0].total_expense);
    const remainingBudget = budgetAmount - totalExpense;
    const percentageUsed = budgetAmount > 0 ? parseFloat(((totalExpense / budgetAmount) * 100).toFixed(2)) : 0;

    let status = 'normal';
    if (budgetAmount > 0) {
      if (percentageUsed > 100) status = 'exceeded';
      else if (percentageUsed >= 80) status = 'warning';
    }

    return res.status(200).json({
      success: true,
      data: {
        id: budgetRes.rows.length ? budgetRes.rows[0].id : null,
        month,
        budget_amount: budgetAmount,
        total_expense: totalExpense,
        remaining_budget: remainingBudget,
        percentage_used: percentageUsed,
        status,
      }
    });
  } catch (error) {
    console.error('Error fetching budget:', error);
    return res.status(500).json({ success: false, error: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
  }
};

/**
 * Get budget history
 * GET /api/budgets/history
 */
const getBudgetHistory = async (req, res) => {
  const userId = req.session.userId;

  try {
    const budgetsRes = await query(
      'SELECT id, month, amount FROM budgets WHERE user_id = $1 ORDER BY month DESC',
      [userId]
    );

    const budgets = [];
    for (const b of budgetsRes.rows) {
      const month = b.month;
      const budgetAmount = parseFloat(b.amount);

      const expenseRes = await query(`
        SELECT COALESCE(SUM(amount), 0) AS total_expense
        FROM transactions
        WHERE user_id = $1 AND type = 'expense' AND TO_CHAR(date, 'YYYY-MM') = $2
      `, [userId, month]);

      const totalExpense = parseFloat(expenseRes.rows[0].total_expense);
      const remainingBudget = budgetAmount - totalExpense;
      const percentageUsed = budgetAmount > 0 ? parseFloat(((totalExpense / budgetAmount) * 100).toFixed(2)) : 0;

      let status = 'normal';
      if (budgetAmount > 0) {
        if (percentageUsed > 100) status = 'exceeded';
        else if (percentageUsed >= 80) status = 'warning';
      }

      budgets.push({
        id: b.id,
        month,
        budget_amount: budgetAmount,
        total_expense: totalExpense,
        remaining_budget: remainingBudget,
        percentage_used: percentageUsed,
        status,
      });
    }

    return res.status(200).json({
      success: true,
      budgets,
    });
  } catch (error) {
    console.error('Error fetching budget history:', error);
    return res.status(500).json({ success: false, error: 'Internal server error', code: 'INTERNAL_SERVER_ERROR' });
  }
};

module.exports = {
  setBudget,
  getMonthlyBudget,
  getBudgetHistory,
};
