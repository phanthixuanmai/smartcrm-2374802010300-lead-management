const { describe, expect, test } = require('@jest/globals');
const { InventoryError, createTransactionPlan } = require('../src/backend/services/inventory');

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

  test('rejects withdrawing more than available stock with HTTP 409', () => {
    expect(() => createTransactionPlan({
      type: 'OUT',
      quantity: 6,
      ticketId: 1,
      createdBy: 'Technician',
      currentStock: 5
    })).toThrow(expect.objectContaining({ statusCode: 409 }));
  });

  test('requires a ticket for stock withdrawal', () => {
    expect(() => createTransactionPlan({
      type: 'OUT',
      quantity: 1,
      createdBy: 'Technician',
      currentStock: 5
    })).toThrow(expect.objectContaining({ statusCode: 400 }));
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
