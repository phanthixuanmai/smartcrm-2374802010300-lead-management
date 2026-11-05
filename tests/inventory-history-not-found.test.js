const { afterAll, beforeAll, expect, test } = require('@jest/globals');
const { startAuthenticatedServer } = require('./authenticated-server');

let server;
let request;

beforeAll(async () => {
  const db = {
    async execute() {
      return [[], []];
    }
  };
  ({ server, request } = await startAuthenticatedServer(db));
});

afterAll(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test('GET inventory transaction history returns 404 for a missing inventory item', async () => {
  const response = await request('/api/inventory/999999999/transactions');

  expect(response.status).toBe(404);
  expect(await response.json()).toMatchObject({ error: 'Inventory item not found' });
});
