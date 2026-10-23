class InventoryError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = 'InventoryError';
    this.statusCode = statusCode;
  }
}

const MAX_TICKET_ID = 18446744073709551615n;
const MAX_QUANTITY = 2147483647;

function createTransactionPlan({ type, quantity, ticketId, createdBy, currentStock }) {
  if (type !== 'IN' && type !== 'OUT') {
    throw new InventoryError('type must be IN or OUT', 400);
  }

  if (!Number.isSafeInteger(quantity) || quantity <= 0 || quantity > MAX_QUANTITY) {
    throw new InventoryError('quantity must be a positive integer', 400);
  }

  if (typeof createdBy !== 'string' || createdBy.trim() === '' || createdBy.trim().length > 100) {
    throw new InventoryError('createdBy is required and must not exceed 100 characters', 400);
  }

  if (!Number.isSafeInteger(currentStock) || currentStock < 0) {
    throw new InventoryError('Inventory stock is invalid', 500);
  }

  let normalizedTicketId = null;
  if (type === 'OUT') {
    if (ticketId === undefined || ticketId === null || String(ticketId).trim() === '') {
      throw new InventoryError('ticketId is required for OUT transactions', 400);
    }

    if (!/^[1-9]\d*$/.test(String(ticketId)) || BigInt(ticketId) > MAX_TICKET_ID) {
      throw new InventoryError('ticketId must be a positive integer', 400);
    }

    normalizedTicketId = String(ticketId);
    if (quantity > currentStock) {
      throw new InventoryError('Insufficient stock for this withdrawal', 409);
    }
  }

  const newStock = type === 'IN' ? currentStock + quantity : currentStock - quantity;
  if (newStock > MAX_QUANTITY) {
    throw new InventoryError('Inventory quantity cannot exceed the maximum supported value', 409);
  }

  return {
    type,
    quantity,
    ticketId: normalizedTicketId,
    createdBy: createdBy.trim(),
    newStock
  };
}

module.exports = { InventoryError, createTransactionPlan };
