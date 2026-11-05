class InventoryError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'InventoryError';
    this.code = code;
  }
}

const MAX_TICKET_ID = 18446744073709551615n;
const MAX_QUANTITY = 2147483647;
const MAX_INVENTORY_ID = 18446744073709551615n;

function validateInventoryId(id) {
  if (typeof id !== 'string' || id.length > 20 || !/^[1-9]\d*$/.test(id)
    || BigInt(id) > MAX_INVENTORY_ID) {
    throw new InventoryError('INVALID_INVENTORY_ID', 'Inventory id must be a positive integer');
  }
}

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

function createInventoryService(repository) {
  return {
    list(filters) {
      return repository.list(filters);
    },

    async get(id) {
      validateInventoryId(id);
      const item = await repository.findById(id);
      if (!item) {
        throw new InventoryError('INVENTORY_NOT_FOUND', 'Inventory item not found');
      }
      return item;
    },

    async listTransactions(id) {
      validateInventoryId(id);
      return repository.listTransactions(id);
    },

    async createTransaction(id, input) {
      validateInventoryId(id);
      const { type, quantity, ticketId, createdBy, note } = input || {};
      if (note !== undefined && note !== null && typeof note !== 'string') {
        throw new InventoryError('INVALID_NOTE', 'note must be a string or null');
      }
      if (typeof note === 'string' && note.length > 500) {
        throw new InventoryError('INVALID_NOTE', 'note must not exceed 500 characters');
      }

      return repository.withTransaction(async (transactionRepository) => {
        const inventory = await transactionRepository.lockInventory(id);
        if (!inventory) {
          throw new InventoryError('INVENTORY_NOT_FOUND', 'Inventory item not found');
        }

        const plan = createTransactionPlan({
          type,
          quantity,
          ticketId,
          createdBy,
          currentStock: inventory.quantity
        });

        if (plan.type === 'OUT'
          && !await transactionRepository.hasOpenTicket(plan.ticketId)) {
          throw new InventoryError('TICKET_NOT_FOUND', 'Open warranty ticket not found');
        }

        await transactionRepository.updateInventory(id, plan.newStock);
        const transactionId = await transactionRepository.insertTransaction({
          inventoryId: id,
          ticketId: plan.ticketId,
          type: plan.type,
          quantity: plan.quantity,
          createdBy: plan.createdBy,
          note: note || null
        });
        return {
          transactionId,
          inventoryId: id,
          type: plan.type,
          quantity: plan.quantity,
          ticketId: plan.ticketId,
          createdBy: plan.createdBy,
          newStock: plan.newStock
        };
      });
    }
  };
}

module.exports = {
  InventoryError,
  createInventoryService,
  createTransactionPlan,
  validateInventoryId
};
