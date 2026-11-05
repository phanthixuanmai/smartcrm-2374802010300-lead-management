const { createApp } = require('../src/backend/app');

const credentials = { username: 'test-admin', password: 'test-password' };

async function startAuthenticatedServer(db) {
  const server = createApp(db, { auth: credentials }).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  });
  if (!loginResponse.ok) {
    throw new Error(`Test login failed with status ${loginResponse.status}`);
  }
  const cookie = loginResponse.headers.get('set-cookie').split(';')[0];

  async function request(path, options = {}) {
    const headers = new Headers(options.headers || {});
    headers.set('Cookie', cookie);
    return fetch(`${baseUrl}${path}`, { ...options, headers });
  }

  return { server, baseUrl, request };
}

module.exports = { startAuthenticatedServer };
