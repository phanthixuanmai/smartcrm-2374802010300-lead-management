const { afterAll, beforeAll, expect, test } = require('@jest/globals');
const { startAuthenticatedServer } = require('./authenticated-server');
const { createPartsService } = require('../src/backend/services/parts');

let server;
let request;

beforeAll(async () => {
  const db = {
    async execute() {
      throw new Error('Invalid price should be rejected before reaching the database');
    }
  };
  ({ server, request } = await startAuthenticatedServer(db));
});

afterAll(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test.each([1.239, 10000000000])(
  'POST /api/parts rejects unit price %s that MySQL cannot persist exactly',
  async (unitPrice) => {
    const response = await request('/api/parts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        part_code: 'PRICE-INVALID',
        name: 'Invalid price',
        unit: 'piece',
        unit_price: unitPrice
      })
    });

    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/unit_price/);
  }
);

test('part service accepts prices representable to two decimal places', async () => {
  const repository = { create: async (part) => part };
  const service = createPartsService(repository);

  await expect(service.create({
    part_code: 'PRICE-VALID',
    name: 'Valid price',
    unit: 'piece',
    unit_price: 0.29
  })).resolves.toMatchObject({ unitPrice: 0.29 });
});
