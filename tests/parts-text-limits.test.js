const { afterAll, beforeAll, expect, test } = require('@jest/globals');
const { startAuthenticatedServer } = require('./authenticated-server');

let server;
let request;

beforeAll(async () => {
  const db = {
    async execute() {
      throw new Error('Overlength part fields should be rejected before reaching the database');
    }
  };
  ({ server, request } = await startAuthenticatedServer(db));
});

afterAll(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test.each([
  ['part_code', 'P'.repeat(41)],
  ['name', 'N'.repeat(151)],
  ['unit', 'U'.repeat(31)],
  ['description', 'D'.repeat(501)]
])('POST /api/parts returns 400 when %s exceeds its database column limit', async (field, value) => {
  const payload = {
    part_code: 'TEXT-LIMIT',
    name: 'Valid part',
    unit: 'piece',
    [field]: value
  };
  const response = await request('/api/parts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  expect(response.status).toBe(400);
  expect((await response.json()).error).toMatch(new RegExp(field));
});
