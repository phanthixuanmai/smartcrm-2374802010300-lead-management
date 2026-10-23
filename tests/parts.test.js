const assert = require('node:assert/strict');
const { afterAll, beforeAll, expect, test } = require('@jest/globals');
const { createApp } = require('../src/backend/app');

const parts = [
  {
    part_id: '1',
    part_code: 'PART-001',
    name: 'Màn hình iPhone 11',
    unit: 'cái',
    description: 'Màn hình thay thế iPhone 11',
    is_active: true
  },
  {
    part_id: '2',
    part_code: 'PART-002',
    name: 'Pin Samsung A52',
    unit: 'cái',
    description: 'Pin thay thế Samsung Galaxy A52',
    is_active: true
  },
  {
    part_id: '3',
    part_code: 'PART-003',
    name: 'Cáp sạc USB-C',
    unit: 'cái',
    description: 'Cáp sạc USB-C dùng cho điện thoại',
    is_active: true
  }
];

let server;
let baseUrl;

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
          description: values[3],
          is_active: values[4]
        };
        parts.push(row);
        return [{ insertId: row.part_id, affectedRows: 1 }, []];
      }

      if (sql.includes('UPDATE part')) {
        const index = parts.findIndex((part) => part.part_id === values[5]);
        if (index === -1) {
          return [{ affectedRows: 0 }, []];
        }

        parts[index] = {
          part_id: values[5],
          part_code: values[0],
          name: values[1],
          unit: values[2],
          description: values[3],
          is_active: values[4]
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

  server = createApp(db).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test('GET /api/parts returns the parts list', async () => {
  const response = await fetch(`${baseUrl}/api/parts`);
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.length, 3);
  expect(result.map((part) => part.part_code)).toEqual(['PART-001', 'PART-002', 'PART-003']);
});

test('GET /api/parts/:id returns a part or 404', async () => {
  const found = await fetch(`${baseUrl}/api/parts/1`);
  assert.equal(found.status, 200);
  assert.equal((await found.json()).part_code, 'PART-001');

  const missing = await fetch(`${baseUrl}/api/parts/999`);
  assert.equal(missing.status, 404);

  const invalidId = await fetch(`${baseUrl}/api/parts/not-a-number`);
  assert.equal(invalidId.status, 400);
});

test('POST /api/parts creates a part and rejects duplicate codes', async () => {
  const payload = {
    part_code: 'PART-004',
    name: 'Fourth part',
    unit: 'piece'
  };
  const created = await fetch(`${baseUrl}/api/parts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  assert.equal(created.status, 201);

  const duplicate = await fetch(`${baseUrl}/api/parts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  assert.equal(duplicate.status, 409);
});

test('PUT /api/parts/:id updates a part and validates input', async () => {
  const updated = await fetch(`${baseUrl}/api/parts/1`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      part_code: 'PART-001',
      name: 'Updated part',
      unit: 'piece'
    })
  });
  assert.equal(updated.status, 200);
  assert.equal((await updated.json()).name, 'Updated part');

  const invalid = await fetch(`${baseUrl}/api/parts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ part_code: 'PART-003' })
  });
  assert.equal(invalid.status, 400);

  const invalidBody = await fetch(`${baseUrl}/api/parts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(null)
  });
  assert.equal(invalidBody.status, 400);
});

test('DELETE /api/parts/:id removes an existing part', async () => {
  const missing = await fetch(`${baseUrl}/api/parts/999`, { method: 'DELETE' });
  assert.equal(missing.status, 404);

  const response = await fetch(`${baseUrl}/api/parts/4`, { method: 'DELETE' });
  assert.equal(response.status, 204);
});
