const { afterAll, beforeAll, expect, test } = require('@jest/globals');
const { createApp } = require('../src/backend/app');

const tickets = [
  { ticket_id: '1', ticket_code: 'BH-2026-001', status: 'OPEN', created_at: '2026-01-01' },
  { ticket_id: '2', ticket_code: 'BH-2026-002', status: 'OPEN', created_at: '2026-01-02' }
];

let server;
let baseUrl;
let nextId = 3;

beforeAll(async () => {
  const db = {
    async execute(sql, values = []) {
      if (sql.includes('DELETE FROM warranty_ticket')) {
        if (values[0] === '1') {
          const error = new Error('Referenced row');
          error.code = 'ER_ROW_IS_REFERENCED_2';
          throw error;
        }
        const index = tickets.findIndex((ticket) => ticket.ticket_id === values[0]);
        if (index === -1) {
          return [{ affectedRows: 0 }, []];
        }
        tickets.splice(index, 1);
        return [{ affectedRows: 1 }, []];
      }

      if (sql.includes('FROM warranty_ticket') && sql.includes('WHERE status = ?')) {
        return [tickets.filter((ticket) => ticket.status === values[0]), []];
      }

      if (sql.includes('FROM warranty_ticket') && sql.includes('WHERE ticket_id = ?')) {
        return [tickets.filter((ticket) => ticket.ticket_id === values[0]), []];
      }

      if (sql.includes('FROM warranty_ticket')) {
        return [[...tickets], []];
      }

      if (sql.includes('INSERT INTO warranty_ticket')) {
        if (tickets.some((ticket) => ticket.ticket_code === values[0])) {
          const error = new Error('Duplicate entry');
          error.code = 'ER_DUP_ENTRY';
          throw error;
        }
        const ticket = {
          ticket_id: String(nextId++),
          ticket_code: values[0],
          status: values[1],
          created_at: '2026-01-03'
        };
        tickets.push(ticket);
        return [{ insertId: ticket.ticket_id, affectedRows: 1 }, []];
      }

      if (sql.includes('UPDATE warranty_ticket')) {
        const ticket = tickets.find((item) => item.ticket_id === values[2]);
        if (!ticket) {
          return [{ affectedRows: 0 }, []];
        }
        if (tickets.some((item) => item.ticket_id !== values[2] && item.ticket_code === values[0])) {
          const error = new Error('Duplicate entry');
          error.code = 'ER_DUP_ENTRY';
          throw error;
        }
        ticket.ticket_code = values[0];
        ticket.status = values[1];
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

test('warranty ticket CRUD returns expected results and rejects invalid input', async () => {
  const listed = await fetch(`${baseUrl}/api/warranty-tickets?status=open`);
  expect(listed.status).toBe(200);
  expect(await listed.json()).toHaveLength(2);

  const invalid = await fetch(`${baseUrl}/api/warranty-tickets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticket_code: 'BH-INVALID', status: 'UNKNOWN' })
  });
  expect(invalid.status).toBe(400);

  const created = await fetch(`${baseUrl}/api/warranty-tickets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticket_code: 'BH-TEST-001' })
  });
  expect(created.status).toBe(201);
  const newTicket = await created.json();
  expect(newTicket).toMatchObject({ ticket_code: 'BH-TEST-001', status: 'OPEN' });

  const duplicate = await fetch(`${baseUrl}/api/warranty-tickets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticket_code: 'BH-TEST-001' })
  });
  expect(duplicate.status).toBe(409);

  const updated = await fetch(`${baseUrl}/api/warranty-tickets/${newTicket.ticket_id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticket_code: 'BH-TEST-001', status: 'CLOSED' })
  });
  expect(updated.status).toBe(200);
  expect(await updated.json()).toMatchObject({ status: 'CLOSED' });

  const removed = await fetch(`${baseUrl}/api/warranty-tickets/${newTicket.ticket_id}`, {
    method: 'DELETE'
  });
  expect(removed.status).toBe(204);

  const missing = await fetch(`${baseUrl}/api/warranty-tickets/${newTicket.ticket_id}`);
  expect(missing.status).toBe(404);
});

test('warranty tickets referenced by stock transactions cannot be deleted', async () => {
  const response = await fetch(`${baseUrl}/api/warranty-tickets/1`, { method: 'DELETE' });
  expect(response.status).toBe(409);
});
