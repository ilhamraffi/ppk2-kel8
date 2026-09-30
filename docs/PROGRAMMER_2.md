# PROGRAMMER_2.md — Backend Developer (Budget API & Logic)

**Programmer:** Programmer 2  
**Modul:** Logika Bisnis & REST API Budget Bulanan  
**Branch Resmi:** `feat/p2-budget-api`  
**Ketergantungan:** Independent (Gunakan skema dari `DB_CONTRACT.md`, tidak perlu menunggu P3)  

---

## 1. Wilayah File yang Boleh Disentuh
- `src/controllers/budgetController.js` (NEW)
- `src/routes/budgetRoutes.js` (NEW)
- `src/app.js` (Hanya untuk register `app.use('/api/budgets', budgetRoutes)`)
- `tests/budget.test.js` (NEW)

> ⚠️ **DILARANG** mengedit `authController.js` atau file di dalam `finance-frontend/`!

---

## 2. Fitur yang Wajib Diimplementasikan

### 1. Set & Update Budget (`POST /api/budgets`)
- **Input Body:** `{ "month": "2026-10", "amount": 2000000 }`
- **Validasi:**
  - `month`: wajib string format `YYYY-MM` (`/^\d{4}-(0[1-9]|1[0-2])$/`).
  - `amount`: wajib angka numerik positif (> 0).
- **Logika:** Menggunakan query upsert `ON CONFLICT (user_id, month) DO UPDATE SET amount = EXCLUDED.amount`.
- **Response (200 / 201):**
  ```json
  {
    "success": true,
    "message": "Budget set successfully",
    "budget": {
      "id": 1,
      "user_id": 4,
      "month": "2026-10",
      "amount": "2000000.00"
    }
  }
  ```

### 2. Get Monthly Budget Summary & Indicator (`GET /api/budgets`)
- **Query Params:** `?month=YYYY-MM` (Jika tidak ada param, gunakan bulan berjalan saat ini: `new Date().toISOString().slice(0, 7)`).
- **Logika Agregasi:**
  1. Cari budget pengguna di bulan tersebut.
  2. Hitung total pengeluaran:
     ```sql
     SELECT COALESCE(SUM(amount), 0) AS total_expense
     FROM transactions
     WHERE user_id = $1 AND type = 'expense' AND TO_CHAR(date, 'YYYY-MM') = $2;
     ```
  3. Hitung `remaining_budget = budget_amount - total_expense`.
  4. Hitung `percentage_used = (total_expense / budget_amount) * 100` (jika budget 0, percentage 0).
  5. Tentukan `status`:
     - `< 80` ➔ `'normal'`
     - `80 - 100` ➔ `'warning'`
     - `> 100` ➔ `'exceeded'`
- **Response (200):** Sesuai spesifikasi di `docs/MODEL_GUIDE.md`.

### 3. Get Budget History (`GET /api/budgets/history`)
- Mengambil daftar seluruh anggaran bulanan yang pernah dibuat oleh user, diurutkan dari bulan terbaru (`ORDER BY month DESC`).

---

## 3. Contoh Implementasi `src/controllers/budgetController.js`

```javascript
const { query } = require('../config/db');

const setBudget = async (req, res) => {
  const userId = req.session.userId;
  const { month, amount } = req.body;

  if (!month || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
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

const getMonthlyBudget = async (req, res) => {
  const userId = req.session.userId;
  const month = req.query.month || new Date().toISOString().slice(0, 7);

  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    return res.status(400).json({ success: false, error: 'Invalid month format (expected YYYY-MM)', code: 'INVALID_INPUT' });
  }

  try {
    // 1. Ambil budget
    const budgetRes = await query(
      'SELECT id, amount FROM budgets WHERE user_id = $1 AND month = $2',
      [userId, month]
    );

    // 2. Ambil total pengeluaran
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

module.exports = {
  setBudget,
  getMonthlyBudget,
};
```

---

## 4. Alur Push & Merge
```bash
git checkout -b feat/p2-budget-api
# Kerjakan file controller, route, dan tests/budget.test.js
npm test # Pastikan semua lulus
git add .
git commit -m "[P2] Implement budget API endpoints and aggregation logic"
git push origin feat/p2-budget-api

# LANGSUNG MERGE KE MAIN
git checkout main
git merge feat/p2-budget-api
git push origin main
```
