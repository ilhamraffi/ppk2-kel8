const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const { pool, query } = require('../src/config/db');
const { initDb } = require('../src/db/initDb');

describe('Budget API and Security Test Suite', () => {
  let userAAgent;
  let userBAgent;
  let userAId;
  let userBId;

  before(async () => {
    await initDb();
    await query('DELETE FROM budgets');
    await query('DELETE FROM transactions');
    await query('DELETE FROM users');

    userAAgent = request.agent(app);
    const resA = await userAAgent.post('/api/auth/register').send({
      name: 'User A',
      email: 'usera_budget@example.com',
      password: 'password123',
    });
    assert.strictEqual(resA.status, 201);
    userAId = resA.body.user.id;

    userBAgent = request.agent(app);
    const resB = await userBAgent.post('/api/auth/register').send({
      name: 'User B',
      email: 'userb_budget@example.com',
      password: 'password123',
    });
    assert.strictEqual(resB.status, 201);
    userBId = resB.body.user.id;
  });

  after(async () => {
    await query('DELETE FROM budgets');
    await query('DELETE FROM transactions');
    await query('DELETE FROM users');
    await pool.end();
  });

  beforeEach(async () => {
    await query('DELETE FROM budgets');
    await query('DELETE FROM transactions');
  });

  it('Unauthenticated requests rejected', async () => {
    const unauthed = request(app);

    const getRes = await unauthed.get('/api/budgets');
    assert.strictEqual(getRes.status, 401);

    const postRes = await unauthed.post('/api/budgets').send({ month: '2026-10', amount: 2000000 });
    assert.strictEqual(postRes.status, 401);

    const historyRes = await unauthed.get('/api/budgets/history');
    assert.strictEqual(historyRes.status, 401);
  });

  it('Rejects invalid input format for POST /api/budgets', async () => {
    // Missing month
    const res1 = await userAAgent.post('/api/budgets').send({ amount: 1000000 });
    assert.strictEqual(res1.status, 400);

    // Invalid month format
    const res2 = await userAAgent.post('/api/budgets').send({ month: '2026-13', amount: 1000000 });
    assert.strictEqual(res2.status, 400);

    const res3 = await userAAgent.post('/api/budgets').send({ month: '2026-9', amount: 1000000 });
    assert.strictEqual(res3.status, 400);

    // Missing amount
    const res4 = await userAAgent.post('/api/budgets').send({ month: '2026-10' });
    assert.strictEqual(res4.status, 400);

    // Amount <= 0
    const res5 = await userAAgent.post('/api/budgets').send({ month: '2026-10', amount: 0 });
    assert.strictEqual(res5.status, 400);

    const res6 = await userAAgent.post('/api/budgets').send({ month: '2026-10', amount: -500 });
    assert.strictEqual(res6.status, 400);
  });

  it('Set and update budget successfully (Upsert)', async () => {
    // Initial set
    const res1 = await userAAgent.post('/api/budgets').send({ month: '2026-10', amount: 2000000 });
    assert.strictEqual(res1.status, 200);
    assert.strictEqual(res1.body.success, true);
    assert.strictEqual(res1.body.budget.month, '2026-10');
    assert.strictEqual(Number(res1.body.budget.amount), 2000000);
    assert.strictEqual(res1.body.budget.user_id, userAId);

    // Update same month
    const res2 = await userAAgent.post('/api/budgets').send({ month: '2026-10', amount: 2500000 });
    assert.strictEqual(res2.status, 200);
    assert.strictEqual(res2.body.success, true);
    assert.strictEqual(Number(res2.body.budget.amount), 2500000);

    // Check DB record count for userA in month 2026-10 (should still be 1)
    const dbRes = await query('SELECT * FROM budgets WHERE user_id = $1 AND month = $2', [userAId, '2026-10']);
    assert.strictEqual(dbRes.rows.length, 1);
    assert.strictEqual(Number(dbRes.rows[0].amount), 2500000);
  });

  it('Calculates monthly budget summary & status indicators correctly', async () => {
    // Set budget 2,000,000 for 2026-10
    await userAAgent.post('/api/budgets').send({ month: '2026-10', amount: 2000000 });

    // 1. Normal status (< 80%, e.g., 1,000,000 / 2,000,000 = 50%)
    await userAAgent.post('/api/transactions').send({
      type: 'expense',
      amount: 1000000,
      description: 'Rent',
      date: '2026-10-05',
    });

    let res = await userAAgent.get('/api/budgets?month=2026-10');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.budget_amount, 2000000);
    assert.strictEqual(res.body.data.total_expense, 1000000);
    assert.strictEqual(res.body.data.remaining_budget, 1000000);
    assert.strictEqual(res.body.data.percentage_used, 50);
    assert.strictEqual(res.body.data.status, 'normal');

    // 2. Warning status (80% - 100%, e.g., add 700,000 expense -> total 1,700,000 / 2,000,000 = 85%)
    await userAAgent.post('/api/transactions').send({
      type: 'expense',
      amount: 700000,
      description: 'Shopping',
      date: '2026-10-10',
    });

    res = await userAAgent.get('/api/budgets?month=2026-10');
    assert.strictEqual(res.body.data.total_expense, 1700000);
    assert.strictEqual(res.body.data.percentage_used, 85);
    assert.strictEqual(res.body.data.status, 'warning');

    // 3. Exceeded status (> 100%, e.g., add 500,000 expense -> total 2,200,000 / 2,000,000 = 110%)
    await userAAgent.post('/api/transactions').send({
      type: 'expense',
      amount: 500000,
      description: 'Extra Party',
      date: '2026-10-15',
    });

    res = await userAAgent.get('/api/budgets?month=2026-10');
    assert.strictEqual(res.body.data.total_expense, 2200000);
    assert.strictEqual(res.body.data.remaining_budget, -200000);
    assert.strictEqual(res.body.data.percentage_used, 110);
    assert.strictEqual(res.body.data.status, 'exceeded');
  });

  it('Budget data is strictly isolated per user (Anti-IDOR)', async () => {
    // User A sets budget 2,000,000 for 2026-10
    await userAAgent.post('/api/budgets').send({ month: '2026-10', amount: 2000000 });
    // User B sets budget 5,000,000 for 2026-10
    await userBAgent.post('/api/budgets').send({ month: '2026-10', amount: 5000000 });

    // User A fetches budget
    const resA = await userAAgent.get('/api/budgets?month=2026-10');
    assert.strictEqual(resA.body.data.budget_amount, 2000000);

    // User B fetches budget
    const resB = await userBAgent.get('/api/budgets?month=2026-10');
    assert.strictEqual(resB.body.data.budget_amount, 5000000);
  });

  it('Returns budget history ordered by month DESC', async () => {
    await userAAgent.post('/api/budgets').send({ month: '2026-08', amount: 1000000 });
    await userAAgent.post('/api/budgets').send({ month: '2026-10', amount: 2000000 });
    await userAAgent.post('/api/budgets').send({ month: '2026-09', amount: 1500000 });

    const res = await userAAgent.get('/api/budgets/history');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.budgets.length, 3);
    assert.strictEqual(res.body.budgets[0].month, '2026-10');
    assert.strictEqual(res.body.budgets[1].month, '2026-09');
    assert.strictEqual(res.body.budgets[2].month, '2026-08');
  });
});
