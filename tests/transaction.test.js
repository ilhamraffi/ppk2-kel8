const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const { pool, query } = require('../src/config/db');
const { initDb } = require('../src/db/initDb');

describe('Transaction API and Security Test Suite', () => {
  let userAAgent;
  let userBAgent;
  let userAId;
  let userBId;

  before(async () => {
    await initDb();
    // Clean test data before running suite
    await query('DELETE FROM transactions');
    await query('DELETE FROM users');

    // Setup Agent for User A
    userAAgent = request.agent(app);
    const resA = await userAAgent.post('/api/auth/register').send({
      name: 'User A',
      email: 'usera@example.com',
      password: 'password123',
    });
    assert.strictEqual(resA.status, 201);
    userAId = resA.body.user.id;

    // Setup Agent for User B
    userBAgent = request.agent(app);
    const resB = await userBAgent.post('/api/auth/register').send({
      name: 'User B',
      email: 'userb@example.com',
      password: 'password123',
    });
    assert.strictEqual(resB.status, 201);
    userBId = resB.body.user.id;
  });

  after(async () => {
    // Cleanup DB and close pool
    await query('DELETE FROM transactions');
    await query('DELETE FROM users');
    await pool.end();
  });

  beforeEach(async () => {
    // Reset transactions before each test to keep tests isolated
    await query('DELETE FROM transactions');
  });

  it('Unauthenticated request rejected', async () => {
    const unauthed = request(app);

    const getRes = await unauthed.get('/api/transactions');
    assert.strictEqual(getRes.status, 401);
    assert.ok(getRes.body.error);

    const postRes = await unauthed.post('/api/transactions').send({
      type: 'expense',
      amount: 50000,
      description: 'Lunch',
      date: '2026-09-23',
    });
    assert.strictEqual(postRes.status, 401);

    const putRes = await unauthed.put('/api/transactions/1').send({
      amount: 60000,
    });
    assert.strictEqual(putRes.status, 401);

    const delRes = await unauthed.delete('/api/transactions/1');
    assert.strictEqual(delRes.status, 401);

    const dashRes = await unauthed.get('/api/dashboard');
    assert.strictEqual(dashRes.status, 401);
  });

  it('Invalid transaction input rejected', async () => {
    // Missing type
    const res1 = await userAAgent.post('/api/transactions').send({
      amount: 50000,
      description: 'Lunch',
      date: '2026-09-23',
    });
    assert.strictEqual(res1.status, 400);

    // Invalid type
    const res2 = await userAAgent.post('/api/transactions').send({
      type: 'transfer',
      amount: 50000,
      description: 'Lunch',
      date: '2026-09-23',
    });
    assert.strictEqual(res2.status, 400);

    // Missing amount
    const res3 = await userAAgent.post('/api/transactions').send({
      type: 'expense',
      description: 'Lunch',
      date: '2026-09-23',
    });
    assert.strictEqual(res3.status, 400);

    // Negative amount
    const res4 = await userAAgent.post('/api/transactions').send({
      type: 'expense',
      amount: -10000,
      description: 'Lunch',
      date: '2026-09-23',
    });
    assert.strictEqual(res4.status, 400);

    // Zero amount
    const res5 = await userAAgent.post('/api/transactions').send({
      type: 'expense',
      amount: 0,
      description: 'Lunch',
      date: '2026-09-23',
    });
    assert.strictEqual(res5.status, 400);

    // Invalid date format
    const res6 = await userAAgent.post('/api/transactions').send({
      type: 'expense',
      amount: 50000,
      description: 'Lunch',
      date: '23-09-2026',
    });
    assert.strictEqual(res6.status, 400);
  });

  it('Create transaction and ignore spoofed user_id', async () => {
    const res = await userAAgent.post('/api/transactions').send({
      user_id: 9999, // Attempt spoofing user_id
      type: 'expense',
      amount: 50000,
      description: 'Lunch',
      date: '2026-09-23',
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.type, 'expense');
    assert.strictEqual(res.body.amount, 50000);
    assert.strictEqual(res.body.description, 'Lunch');
    assert.strictEqual(res.body.date, '2026-09-23');
    // Must be bound to authenticated User A, NOT spoofed user_id
    assert.strictEqual(res.body.user_id, userAId);
  });

  it('Data actually persists in PostgreSQL', async () => {
    const res = await userAAgent.post('/api/transactions').send({
      type: 'income',
      amount: 1500000,
      description: 'Monthly Allowance',
      date: '2026-09-23',
    });
    assert.strictEqual(res.status, 201);
    const txId = res.body.id;

    // Directly query database to verify persistence
    const dbRes = await query('SELECT * FROM transactions WHERE id = $1', [txId]);
    assert.strictEqual(dbRes.rows.length, 1);
    const row = dbRes.rows[0];
    assert.strictEqual(row.user_id, userAId);
    assert.strictEqual(row.type, 'income');
    assert.strictEqual(Number(row.amount), 1500000);
    assert.strictEqual(row.description, 'Monthly Allowance');
  });

  it('Read own transactions', async () => {
    await userAAgent.post('/api/transactions').send({
      type: 'expense',
      amount: 25000,
      description: 'Breakfast',
      date: '2026-09-22',
    });
    await userAAgent.post('/api/transactions').send({
      type: 'income',
      amount: 500000,
      description: 'Side Project',
      date: '2026-09-23',
    });

    const res = await userAAgent.get('/api/transactions');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(Array.isArray(res.body), true);
    assert.strictEqual(res.body.length, 2);
    // Ordered by date DESC
    assert.strictEqual(res.body[0].description, 'Side Project');
    assert.strictEqual(res.body[1].description, 'Breakfast');
  });

  it('Filter ?type=income and Filter ?type=expense', async () => {
    await userAAgent.post('/api/transactions').send({
      type: 'income',
      amount: 100000,
      description: 'Gift',
      date: '2026-09-20',
    });
    await userAAgent.post('/api/transactions').send({
      type: 'expense',
      amount: 30000,
      description: 'Book',
      date: '2026-09-21',
    });
    await userAAgent.post('/api/transactions').send({
      type: 'income',
      amount: 200000,
      description: 'Freelance',
      date: '2026-09-22',
    });

    // Test filter ?type=income
    const incomeRes = await userAAgent.get('/api/transactions?type=income');
    assert.strictEqual(incomeRes.status, 200);
    assert.strictEqual(incomeRes.body.length, 2);
    assert.ok(incomeRes.body.every((tx) => tx.type === 'income'));

    // Test filter ?type=expense
    const expenseRes = await userAAgent.get('/api/transactions?type=expense');
    assert.strictEqual(expenseRes.status, 200);
    assert.strictEqual(expenseRes.body.length, 1);
    assert.strictEqual(expenseRes.body[0].type, 'expense');
    assert.strictEqual(expenseRes.body[0].amount, 30000);
  });

  it('Update own transaction', async () => {
    const createRes = await userAAgent.post('/api/transactions').send({
      type: 'expense',
      amount: 50000,
      description: 'Lunch',
      date: '2026-09-23',
    });
    const txId = createRes.body.id;

    const updateRes = await userAAgent.put(`/api/transactions/${txId}`).send({
      amount: 75000,
      description: 'Buffet Lunch',
    });

    assert.strictEqual(updateRes.status, 200);
    assert.strictEqual(updateRes.body.id, txId);
    assert.strictEqual(updateRes.body.amount, 75000);
    assert.strictEqual(updateRes.body.description, 'Buffet Lunch');

    // Confirm in DB
    const dbRes = await query('SELECT * FROM transactions WHERE id = $1', [txId]);
    assert.strictEqual(Number(dbRes.rows[0].amount), 75000);
    assert.strictEqual(dbRes.rows[0].description, 'Buffet Lunch');
  });

  it('Delete own transaction', async () => {
    const createRes = await userAAgent.post('/api/transactions').send({
      type: 'expense',
      amount: 50000,
      description: 'Lunch',
      date: '2026-09-23',
    });
    const txId = createRes.body.id;

    const delRes = await userAAgent.delete(`/api/transactions/${txId}`);
    assert.strictEqual(delRes.status, 200);
    assert.strictEqual(delRes.body.id, txId);

    // Confirm deleted from DB
    const dbRes = await query('SELECT * FROM transactions WHERE id = $1', [txId]);
    assert.strictEqual(dbRes.rows.length, 0);

    // Confirm deleted in GET list
    const getRes = await userAAgent.get('/api/transactions');
    assert.strictEqual(getRes.body.length, 0);
  });

  it('Dashboard totals are correct', async () => {
    // User A has 3,000,000 income and 1,500,000 expense
    await userAAgent.post('/api/transactions').send({
      type: 'income',
      amount: 3000000,
      description: 'Salary',
      date: '2026-09-01',
    });
    await userAAgent.post('/api/transactions').send({
      type: 'expense',
      amount: 1000000,
      description: 'Rent',
      date: '2026-09-02',
    });
    await userAAgent.post('/api/transactions').send({
      type: 'expense',
      amount: 500000,
      description: 'Groceries',
      date: '2026-09-03',
    });

    // User B adds transactions to ensure User A's dashboard is strictly isolated
    await userBAgent.post('/api/transactions').send({
      type: 'income',
      amount: 9999999,
      description: 'User B Wealth',
      date: '2026-09-01',
    });

    const res = await userAAgent.get('/api/dashboard');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.balance, 1500000);
    assert.strictEqual(res.body.total_income, 3000000);
    assert.strictEqual(res.body.total_expense, 1500000);
  });

  it("User A cannot read User B's transaction", async () => {
    // User B creates a transaction
    const resB = await userBAgent.post('/api/transactions').send({
      type: 'income',
      amount: 5000000,
      description: 'Secret Bonus User B',
      date: '2026-09-23',
    });
    const txBId = resB.body.id;

    // User A lists transactions: User B's transaction must not appear
    const listResA = await userAAgent.get('/api/transactions');
    assert.strictEqual(listResA.status, 200);
    const found = listResA.body.find((tx) => tx.id === txBId);
    assert.strictEqual(found, undefined);

    // User A directly accesses User B's transaction by ID: must be rejected with 403 Forbidden
    const detailResA = await userAAgent.get(`/api/transactions/${txBId}`);
    assert.strictEqual(detailResA.status, 403);
    assert.strictEqual(detailResA.body.error, 'Forbidden: You do not have access to this transaction');
  });

  it("User A cannot update User B's transaction", async () => {
    // User B creates a transaction
    const resB = await userBAgent.post('/api/transactions').send({
      type: 'expense',
      amount: 100000,
      description: 'User B Expense',
      date: '2026-09-23',
    });
    const txBId = resB.body.id;

    // User A attempts to update User B's transaction
    const updateResA = await userAAgent.put(`/api/transactions/${txBId}`).send({
      amount: 10,
      description: 'Hacked by User A',
    });

    assert.strictEqual(updateResA.status, 403);
    assert.strictEqual(updateResA.body.error, 'Forbidden: You do not have access to this transaction');

    // Ensure database was NOT modified
    const dbRes = await query('SELECT * FROM transactions WHERE id = $1', [txBId]);
    assert.strictEqual(Number(dbRes.rows[0].amount), 100000);
    assert.strictEqual(dbRes.rows[0].description, 'User B Expense');
  });

  it("User A cannot delete User B's transaction", async () => {
    // User B creates a transaction
    const resB = await userBAgent.post('/api/transactions').send({
      type: 'expense',
      amount: 200000,
      description: 'User B Protected Data',
      date: '2026-09-23',
    });
    const txBId = resB.body.id;

    // User A attempts to delete User B's transaction
    const deleteResA = await userAAgent.delete(`/api/transactions/${txBId}`);

    assert.strictEqual(deleteResA.status, 403);
    assert.strictEqual(deleteResA.body.error, 'Forbidden: You do not have access to this transaction');

    // Ensure database record still exists
    const dbRes = await query('SELECT * FROM transactions WHERE id = $1', [txBId]);
    assert.strictEqual(dbRes.rows.length, 1);
  });
});

