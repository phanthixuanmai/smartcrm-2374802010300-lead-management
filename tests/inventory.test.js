const { afterAll, beforeAll, describe, expect, test } = require('@jest/globals');
const { startAuthenticatedServer } = require('./authenticated-server');
const { InventoryError, createTransactionPlan } = require('../src/backend/services/inventory');

let server;
let baseUrl;
let request;
let executedStatements;
let rollbackCount;

beforeAll(async () => {
  const connection = {
    async beginTransaction() {},
    async execute(sql) {
      executedStatements.push(sql);
      return [[{ inventory_id: '1', quantity: 5 }], []];
    },
    async rollback() {
      rollbackCount += 1;
    },
    release() {}
  };
  const db = {
    async execute(sql, values) {
      executedStatements.push({ sql, values });
      return [[], []];
    },
    async getConnection() { return connection; }
  };
  executedStatements = [];
  rollbackCount = 0;

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
      executedStatements.length = 0;
      rollbackCount = 0;
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
      expect(executedStatements).toHaveLength(1);
      expect(executedStatements[0]).toContain('FOR UPDATE');
      expect(rollbackCount).toBe(1);
    });

    test.each(["' OR 1=1 --", '<script>alert(1)</script>'])(
      'keeps search input out of SQL for %s',
      async (query) => {
        executedStatements.length = 0;
        const response = await request(`/api/inventory?q=${encodeURIComponent(query)}`);

        expect(response.status).toBe(200);
        expect(executedStatements).toHaveLength(1);
        expect(executedStatements[0].sql).not.toContain(query);
        expect(executedStatements[0].values).toContain(`%${query}%`);
      }
    );
  });

  test('accepts withdrawals just below and exactly at available stock', () => {
    for (const quantity of [4, 5]) {
      expect(createTransactionPlan({
        type: 'OUT',
        quantity,
        ticketId: 1,
        createdBy: 'Technician',
        currentStock: 5
      }).newStock).toBe(5 - quantity);
    }
  });

  test('accepts stock receipt', () => {
    expect(createTransactionPlan({
      type: 'IN',
      quantity: 2,
      createdBy: 'Technician',
      currentStock: 5
    })).toMatchObject({ type: 'IN', ticketId: null, newStock: 7 });
  });

  test('repeats the same transaction plan without mutating its input', () => {
    const input = Object.freeze({
      type: 'IN',
      quantity: 2,
      createdBy: 'Technician',
      currentStock: 5
    });

    const first = createTransactionPlan(input);
    const second = createTransactionPlan(input);

    expect(second).toEqual(first);
    expect(input).toEqual({
      type: 'IN',
      quantity: 2,
      createdBy: 'Technician',
      currentStock: 5
    });
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
