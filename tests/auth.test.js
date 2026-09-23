const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const { pool, query } = require('../src/config/db');
const { initDb } = require('../src/db/initDb');

describe('Auth API Test Suite', () => {
  before(async () => {
    await initDb();
    await query('DELETE FROM transactions');
    await query('DELETE FROM users');
  });

  after(async () => {
    await query('DELETE FROM transactions');
    await query('DELETE FROM users');
    await pool.end();
  });

  it('Registers new user and rejects duplicate email', async () => {
    const client = request.agent(app);
    const regRes = await client.post('/api/auth/register').send({
      name: 'Adhyaksa',
      email: 'adhyaksa@example.com',
      password: 'password123',
    });

    assert.strictEqual(regRes.status, 201);
    assert.strictEqual(regRes.body.user.email, 'adhyaksa@example.com');

    // Duplicate email
    const dupRes = await client.post('/api/auth/register').send({
      name: 'Duplicate',
      email: 'adhyaksa@example.com',
      password: 'password123',
    });
    assert.strictEqual(dupRes.status, 409);
  });

  it('Logs in user with correct credentials and rejects incorrect password', async () => {
    const client = request.agent(app);

    // Wrong password
    const failRes = await client.post('/api/auth/login').send({
      email: 'adhyaksa@example.com',
      password: 'wrongpassword',
    });
    assert.strictEqual(failRes.status, 401);

    // Correct password
    const successRes = await client.post('/api/auth/login').send({
      email: 'adhyaksa@example.com',
      password: 'password123',
    });
    assert.strictEqual(successRes.status, 200);
    assert.strictEqual(successRes.body.user.email, 'adhyaksa@example.com');

    // Logout
    const logoutRes = await client.post('/api/auth/logout');
    assert.strictEqual(logoutRes.status, 200);
  });
});

