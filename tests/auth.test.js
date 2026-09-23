const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const bcrypt = require('bcryptjs');
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

  it('Registers a new user successfully', async () => {
    const client = request.agent(app);
    const res = await client.post('/api/auth/register').send({
      name: 'Adhyaksa',
      email: 'adhyaksa@example.com',
      password: 'password123',
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.user.email, 'adhyaksa@example.com');
    assert.strictEqual(res.body.user.name, 'Adhyaksa');
    assert.strictEqual(res.body.user.password, undefined);
    assert.strictEqual(res.body.user.hash, undefined);
  });

  it('Rejects duplicate email registration', async () => {
    const client = request.agent(app);
    const res = await client.post('/api/auth/register').send({
      name: 'Duplicate',
      email: 'adhyaksa@example.com',
      password: 'password123',
    });
    assert.strictEqual(res.status, 409);
  });

  it('Rejects invalid registration payloads', async () => {
    const client = request.agent(app);

    const missingName = await client.post('/api/auth/register').send({
      email: 'newuser@example.com',
      password: 'password123',
    });
    assert.strictEqual(missingName.status, 400);

    const blankName = await client.post('/api/auth/register').send({
      name: '   ',
      email: 'newuser2@example.com',
      password: 'password123',
    });
    assert.strictEqual(blankName.status, 400);

    const badEmail = await client.post('/api/auth/register').send({
      name: 'Bad Email',
      email: 'not-an-email',
      password: 'password123',
    });
    assert.strictEqual(badEmail.status, 400);

    const shortPassword = await client.post('/api/auth/register').send({
      name: 'Short Password',
      email: 'shortpw@example.com',
      password: '123',
    });
    assert.strictEqual(shortPassword.status, 400);

    const missingPassword = await client.post('/api/auth/register').send({
      name: 'No Password',
      email: 'nopass@example.com',
    });
    assert.strictEqual(missingPassword.status, 400);
  });

  it('Hashes password and never stores plaintext', async () => {
    const dbRes = await query('SELECT * FROM users WHERE email = $1', ['adhyaksa@example.com']);
    assert.strictEqual(dbRes.rows.length, 1);
    const storedPassword = dbRes.rows[0].password;

    assert.notStrictEqual(storedPassword, 'password123');
    assert.ok(storedPassword.startsWith('$2')); // bcrypt hash prefix
    const matches = await bcrypt.compare('password123', storedPassword);
    assert.strictEqual(matches, true);
  });

  it('Data actually persists in PostgreSQL after registration', async () => {
    const dbRes = await query('SELECT id, name, email FROM users WHERE email = $1', ['adhyaksa@example.com']);
    assert.strictEqual(dbRes.rows.length, 1);
    assert.strictEqual(dbRes.rows[0].name, 'Adhyaksa');
  });

  it('Rejects login with invalid credentials', async () => {
    const client = request.agent(app);

    const wrongPassword = await client.post('/api/auth/login').send({
      email: 'adhyaksa@example.com',
      password: 'wrongpassword',
    });
    assert.strictEqual(wrongPassword.status, 401);

    const nonExistentUser = await client.post('/api/auth/login').send({
      email: 'nobody@example.com',
      password: 'password123',
    });
    assert.strictEqual(nonExistentUser.status, 401);

    const missingFields = await client.post('/api/auth/login').send({
      email: 'adhyaksa@example.com',
    });
    assert.strictEqual(missingFields.status, 400);
  });

  it('Rejects protected route access without a session', async () => {
    const unauthed = request(app);
    const res = await unauthed.get('/api/auth/me');
    assert.strictEqual(res.status, 401);
    assert.ok(res.body.error);
  });

  it('Logs in with valid credentials and grants access to protected route', async () => {
    const client = request.agent(app);

    const loginRes = await client.post('/api/auth/login').send({
      email: 'adhyaksa@example.com',
      password: 'password123',
    });
    assert.strictEqual(loginRes.status, 200);
    assert.strictEqual(loginRes.body.user.email, 'adhyaksa@example.com');
    assert.strictEqual(loginRes.body.user.password, undefined);

    const meRes = await client.get('/api/auth/me');
    assert.strictEqual(meRes.status, 200);
    assert.strictEqual(meRes.body.email, 'adhyaksa@example.com');
    assert.strictEqual(meRes.body.name, 'Adhyaksa');
    assert.strictEqual(typeof meRes.body.id, 'number');
    assert.strictEqual(meRes.body.password, undefined);
    assert.strictEqual(meRes.body.hash, undefined);
  });

  it('Logs out and invalidates the session', async () => {
    const client = request.agent(app);

    const loginRes = await client.post('/api/auth/login').send({
      email: 'adhyaksa@example.com',
      password: 'password123',
    });
    assert.strictEqual(loginRes.status, 200);

    // Confirm session works before logout
    const meBefore = await client.get('/api/auth/me');
    assert.strictEqual(meBefore.status, 200);

    const logoutRes = await client.post('/api/auth/logout');
    assert.strictEqual(logoutRes.status, 200);

    // Session must be destroyed; /api/auth/me must now return 401
    const meAfter = await client.get('/api/auth/me');
    assert.strictEqual(meAfter.status, 401);
  });
});