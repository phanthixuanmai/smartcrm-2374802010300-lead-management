const assert = require('node:assert/strict');
const { afterAll, beforeAll, expect, test } = require('@jest/globals');
const { startAuthenticatedServer } = require('./authenticated-server');

const parts = [
  {
    part_id: '1',
    part_code: 'PART-001',
    name: 'Màn hình iPhone 11',
    unit: 'cái',
    unit_price: 120000,
    description: 'Màn hình thay thế iPhone 11',
    is_active: true
  },
  {
    part_id: '2',
    part_code: 'PART-002',
    name: 'Pin Samsung A52',
    unit: 'cái',
    unit_price: 300000,
    description: 'Pin thay thế Samsung Galaxy A52',
    is_active: true
  },
  {
    part_id: '3',
    part_code: 'PART-003',
    name: 'Cáp sạc USB-C',
    unit: 'cái',
    unit_price: 50000,
    description: 'Cáp sạc USB-C dùng cho điện thoại',
    is_active: true
  }
];

let server;
let baseUrl;
let request;

beforeAll(async () => {
  const db = {
    async execute(sql, values = []) {
      if (sql.includes('FROM part') && sql.includes('ORDER BY part_id')) {
        return [parts, []];
      }

      if (sql.includes('SELECT part_id FROM part')) {
        const rows = parts.filter((part) => part.part_id === values[0]);
        return [rows.map(({ part_id }) => ({ part_id })), []];
      }

      if (sql.trimStart().startsWith('SELECT') && sql.includes('WHERE part_id = ?')) {
        const rows = parts.filter((part) => part.part_id === values[0]);
        return [rows, []];
      }

      if (sql.includes('INSERT INTO part')) {
        if (parts.some((part) => part.part_code === values[0])) {
          const error = new Error('Duplicate entry');
          error.code = 'ER_DUP_ENTRY';
          throw error;
        }

        const row = {
          part_id: String(parts.length + 1),
          part_code: values[0],
          name: values[1],
          unit: values[2],
          unit_price: values[3],
          description: values[4],
          is_active: values[5]
        };
        parts.push(row);
        return [{ insertId: row.part_id, affectedRows: 1 }, []];
      }

      if (sql.includes('UPDATE part')) {
        const index = parts.findIndex((part) => part.part_id === values[6]);
        if (index === -1) {
          return [{ affectedRows: 0 }, []];
        }

        parts[index] = {
          part_id: values[6],
          part_code: values[0],
          name: values[1],
          unit: values[2],
          unit_price: values[3],
          description: values[4],
          is_active: values[5]
        };
        return [{ affectedRows: 1 }, []];
      }

      if (sql.includes('DELETE FROM part')) {
        const index = parts.findIndex((part) => part.part_id === values[0]);
        if (index === -1) {
          return [{ affectedRows: 0 }, []];
        }

        parts.splice(index, 1);
        return [{ affectedRows: 1 }, []];
      }

      throw new Error(`Unexpected statement: ${sql}`);
    }
  };

  ({ server, baseUrl, request } = await startAuthenticatedServer(db));
});

afterAll(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test('GET /api/parts returns the parts list', async () => {
  const response = await request('/api/parts');
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.length, 3);
  expect(result.map((part) => part.part_code)).toEqual(['PART-001', 'PART-002', 'PART-003']);
});

test('GET /health returns a healthy status', async () => {
  const response = await fetch(`${baseUrl}/health`);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).status, 'ok');
});

test('GET /api/parts/:id returns a part or 404', async () => {
  const found = await request('/api/parts/1');
  assert.equal(found.status, 200);
  assert.equal((await found.json()).part_code, 'PART-001');

  const missing = await request('/api/parts/999');
  assert.equal(missing.status, 404);

  const invalidId = await request('/api/parts/not-a-number');
  assert.equal(invalidId.status, 400);
});

test('POST /api/parts creates a part and rejects duplicate codes', async () => {
  const payload = {
    part_code: 'PART-004',
    name: 'Fourth part',
    unit: 'piece',
    unit_price: 125000
  };
  const created = await request('/api/parts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  assert.equal(created.status, 201);
  assert.equal((await created.json()).unit_price, 125000);

  const duplicate = await request('/api/parts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  assert.equal(duplicate.status, 409);
});

test('PUT /api/parts/:id updates a part and validates input', async () => {
  const updated = await request('/api/parts/1', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      part_code: 'PART-001',
      name: 'Updated part',
      unit: 'piece',
      unit_price: 90000
    })
  });
  assert.equal(updated.status, 200);
  assert.equal((await updated.json()).name, 'Updated part');

  const invalidPrice = await request('/api/parts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ part_code: 'PART-005', name: 'Part', unit: 'piece', unit_price: -1 })
  });
  assert.equal(invalidPrice.status, 400);

  const invalid = await request('/api/parts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ part_code: 'PART-003' })
  });
  assert.equal(invalid.status, 400);

  const invalidBody = await request('/api/parts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(null)
  });
  assert.equal(invalidBody.status, 400);
});

test('DELETE /api/parts/:id removes an existing part', async () => {
  const missing = await request('/api/parts/999', { method: 'DELETE' });
  assert.equal(missing.status, 404);

  const response = await request('/api/parts/4', { method: 'DELETE' });
  assert.equal(response.status, 204);
});
