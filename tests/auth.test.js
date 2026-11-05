const { afterAll, beforeAll, expect, test } = require('@jest/globals');
const { createApp } = require('../src/backend/app');

let server;
let baseUrl;

beforeAll(async () => {
  server = createApp({ async execute() { return [[], []]; } }, {
    auth: { username: 'test-admin', password: 'test-password' }
  }).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test('requires a valid login before accessing data and supports logout', async () => {
  const denied = await fetch(`${baseUrl}/api/parts`);
  expect(denied.status).toBe(401);

  const invalidLogin = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'test-admin', password: 'incorrect' })
  });
  expect(invalidLogin.status).toBe(401);

  const login = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'test-admin', password: 'test-password' })
  });
  expect(login.status).toBe(200);
  expect((await login.json()).user.username).toBe('test-admin');
  const cookie = login.headers.get('set-cookie');
  expect(cookie).toContain('HttpOnly');
  expect(cookie).toContain('SameSite=Lax');
  const sessionCookie = cookie.split(';')[0];

  const session = await fetch(`${baseUrl}/api/auth/session`, {
    headers: { Cookie: sessionCookie }
  });
  expect(session.status).toBe(200);
  expect((await session.json()).user.username).toBe('test-admin');

  const authorized = await fetch(`${baseUrl}/api/parts`, {
    headers: { Cookie: sessionCookie }
  });
  expect(authorized.status).toBe(200);

  const logout = await fetch(`${baseUrl}/api/auth/logout`, {
    method: 'POST',
    headers: { Cookie: sessionCookie }
  });
  expect(logout.status).toBe(200);
  expect(logout.headers.get('set-cookie')).toContain('Max-Age=0');

  const expiredSession = await fetch(`${baseUrl}/api/auth/session`, {
    headers: { Cookie: sessionCookie }
  });
  expect(expiredSession.status).toBe(401);
});

test('returns a setup error when login credentials are not configured', async () => {
  const app = createApp({});
  const unconfiguredServer = app.listen(0);
  await new Promise((resolve) => unconfiguredServer.once('listening', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${unconfiguredServer.address().port}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'password' })
    });
    expect(response.status).toBe(503);
    } finally {
      unconfiguredServer.closeAllConnections();
      await new Promise((resolve, reject) => {
        unconfiguredServer.close((error) => (error ? reject(error) : resolve()));
      });
    }
});
