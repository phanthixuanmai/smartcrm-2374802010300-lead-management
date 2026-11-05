const { afterAll, beforeAll, describe, expect, test } = require('@jest/globals');
const { startAuthenticatedServer } = require('./authenticated-server');
const { InventoryError, createTransactionPlan } = require('../src/backend/services/inventory');

let server;
let baseUrl;
let request;

beforeAll(async () => {
  const connection = {
    async beginTransaction() {},
    async execute() {
      return [[{ inventory_id: '1', quantity: 5 }], []];
    },
    async rollback() {},
    release() {}
  };
  const db = { async getConnection() { return connection; } };

  ({ server, baseUrl, request } = await startAuthenticatedServer(db));
});

afterAll(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

describe('createTransactionPlan', () => {
  test('withdraws stock and associates an open-ticket id', () => {
    expect(createTransactionPlan({
      type: 'OUT',
      quantity: 2,
      ticketId: '1',
      createdBy: 'Technician',
      currentStock: 5
    })).toEqual({
      type: 'OUT',
      quantity: 2,
      ticketId: '1',
      createdBy: 'Technician',
      newStock: 3
    });
  });

  describe('POST /api/inventory/:id/transactions', () => {
    test('maps invalid domain input to HTTP 400', async () => {
      const response = await request('/api/inventory/1/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'IN', quantity: 0, createdBy: 'Technician' })
      });

      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ error: 'quantity must be a positive integer' });
    });

    test('maps insufficient stock to HTTP 409', async () => {
      const response = await request('/api/inventory/1/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'OUT',
          quantity: 6,
          ticketId: '1',
          createdBy: 'Technician'
        })
      });

      expect(response.status).toBe(409);
      expect(await response.json()).toMatchObject({ error: 'Insufficient stock for this withdrawal' });
    });
  });

  test('allows withdrawing exactly the available stock', () => {
    expect(createTransactionPlan({
      type: 'OUT',
      quantity: 5,
      ticketId: 1,
      createdBy: 'Technician',
      currentStock: 5
    }).newStock).toBe(0);
  });

  test('accepts stock receipt', () => {
    expect(createTransactionPlan({
      type: 'IN',
      quantity: 2,
      createdBy: 'Technician',
      currentStock: 5
    })).toMatchObject({ type: 'IN', ticketId: null, newStock: 7 });
  });

  test.each([0, -1, 1.5, NaN, '2'])('rejects invalid quantity %s', (quantity) => {
    expect(() => createTransactionPlan({
      type: 'IN',
      quantity,
      createdBy: 'Technician',
      currentStock: 5
    })).toThrow(InventoryError);
  });

  test('rejects withdrawing more than available stock', () => {
    expect(() => createTransactionPlan({
      type: 'OUT',
      quantity: 6,
      ticketId: 1,
      createdBy: 'Technician',
      currentStock: 5
    })).toThrow(expect.objectContaining({ code: 'INSUFFICIENT_STOCK' }));
  });

  test('requires a ticket for stock withdrawal', () => {
    expect(() => createTransactionPlan({
      type: 'OUT',
      quantity: 1,
      createdBy: 'Technician',
      currentStock: 5
    })).toThrow(expect.objectContaining({ code: 'MISSING_TICKET' }));
  });

  test('rejects missing actor and unsupported transaction type', () => {
    expect(() => createTransactionPlan({
      type: 'IN', quantity: 1, createdBy: '', currentStock: 5
    })).toThrow(InventoryError);
    expect(() => createTransactionPlan({
      type: 'INVALID', quantity: 1, createdBy: 'Technician', currentStock: 5
    })).toThrow(InventoryError);
  });
});
