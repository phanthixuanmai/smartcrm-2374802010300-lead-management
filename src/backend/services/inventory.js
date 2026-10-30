class InventoryError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'InventoryError';
    this.code = code;
  }
}

const MAX_TICKET_ID = 18446744073709551615n;
const MAX_QUANTITY = 2147483647;

function createTransactionPlan({ type, quantity, ticketId, createdBy, currentStock }) {
  if (type !== 'IN' && type !== 'OUT') {
    throw new InventoryError('INVALID_TRANSACTION_TYPE', 'type must be IN or OUT');
  }

  if (!Number.isSafeInteger(quantity) || quantity <= 0 || quantity > MAX_QUANTITY) {
    throw new InventoryError('INVALID_QUANTITY', 'quantity must be a positive integer');
  }

  if (typeof createdBy !== 'string' || createdBy.trim() === '' || createdBy.trim().length > 100) {
    throw new InventoryError('INVALID_ACTOR', 'createdBy is required and must not exceed 100 characters');
  }

  if (!Number.isSafeInteger(currentStock) || currentStock < 0) {
    throw new InventoryError('INVALID_CURRENT_STOCK', 'Inventory stock is invalid');
  }

  let normalizedTicketId = null;
  if (type === 'OUT') {
    if (ticketId === undefined || ticketId === null || String(ticketId).trim() === '') {
      throw new InventoryError('MISSING_TICKET', 'ticketId is required for OUT transactions');
    }

    if (!/^[1-9]\d*$/.test(String(ticketId)) || BigInt(ticketId) > MAX_TICKET_ID) {
      throw new InventoryError('INVALID_TICKET_ID', 'ticketId must be a positive integer');
    }

    normalizedTicketId = String(ticketId);
    if (quantity > currentStock) {
      throw new InventoryError('INSUFFICIENT_STOCK', 'Insufficient stock for this withdrawal');
    }
  }

  const newStock = type === 'IN' ? currentStock + quantity : currentStock - quantity;
  if (newStock > MAX_QUANTITY) {
    throw new InventoryError(
      'QUANTITY_LIMIT_EXCEEDED',
      'Inventory quantity cannot exceed the maximum supported value'
    );
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
