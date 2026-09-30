const express = require('express');
const router = express.Router();
const budgetController = require('../controllers/budgetController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', budgetController.getMonthlyBudget);
router.post('/', budgetController.setBudget);
router.get('/history', budgetController.getBudgetHistory);

module.exports = router;
