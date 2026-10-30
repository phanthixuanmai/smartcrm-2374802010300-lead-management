class WarrantyTicketError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'WarrantyTicketError';
    this.code = code;
  }
}

const TICKET_STATUSES = ['OPEN', 'CLOSED', 'CANCELLED'];
const MAX_ID = 18446744073709551615n;

function validateId(id) {
  if (typeof id !== 'string' || id.length > 20 || !/^[1-9]\d*$/.test(id)
    || BigInt(id) > MAX_ID) {
    throw new WarrantyTicketError('INVALID_ID', 'Ticket id must be a positive integer');
  }
}

function normalizeTicket(input, { allowDefaultStatus = false } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new WarrantyTicketError('INVALID_DATA', 'Ticket data must be an object');
  }

  const allowedFields = ['ticket_code', 'status'];
  const unexpectedFields = Object.keys(input).filter((field) => !allowedFields.includes(field));
  if (unexpectedFields.length > 0) {
    throw new WarrantyTicketError('INVALID_DATA', `Unexpected fields: ${unexpectedFields.join(', ')}`);
  }

  if (typeof input.ticket_code !== 'string' || input.ticket_code.trim() === ''
    || input.ticket_code.trim().length > 40) {
    throw new WarrantyTicketError('INVALID_DATA', 'ticket_code is required and must not exceed 40 characters');
  }

  const status = input.status === undefined && allowDefaultStatus ? 'OPEN' : input.status;
  if (typeof status !== 'string' || !TICKET_STATUSES.includes(status.toUpperCase())) {
    throw new WarrantyTicketError('INVALID_STATUS', 'status must be OPEN, CLOSED, or CANCELLED');
  }

  return { ticketCode: input.ticket_code.trim(), status: status.toUpperCase() };
}

function translateDuplicateCode(error) {
  if (error.code === 'ER_DUP_ENTRY') {
    throw new WarrantyTicketError('DUPLICATE_TICKET_CODE', 'A warranty ticket with this code already exists');
  }
  throw error;
}

async function listWarrantyTickets(db, status) {
  const normalizedStatus = status === undefined ? null : String(status).toUpperCase();
  if (normalizedStatus && !TICKET_STATUSES.includes(normalizedStatus)) {
    throw new WarrantyTicketError('INVALID_STATUS', 'status must be OPEN, CLOSED, or CANCELLED');
  }
  const [rows] = await db.execute(
    `SELECT ticket_id, ticket_code, status, created_at
     FROM warranty_ticket
     ${normalizedStatus ? 'WHERE status = ?' : ''}
     ORDER BY created_at DESC, ticket_id DESC`,
    normalizedStatus ? [normalizedStatus] : []
  );
  return rows;
}

async function getWarrantyTicket(db, id) {
  validateId(id);
  const [rows] = await db.execute(
    `SELECT ticket_id, ticket_code, status, created_at
     FROM warranty_ticket WHERE ticket_id = ?`,
    [id]
  );
  if (rows.length === 0) {
    throw new WarrantyTicketError('TICKET_NOT_FOUND', 'Warranty ticket not found');
  }
  return rows[0];
}

async function createWarrantyTicket(db, input) {
  const ticket = normalizeTicket(input, { allowDefaultStatus: true });
  let result;
  try {
    [result] = await db.execute(
      'INSERT INTO warranty_ticket (ticket_code, status) VALUES (?, ?)',
      [ticket.ticketCode, ticket.status]
    );
  } catch (error) {
    translateDuplicateCode(error);
  }
  return getWarrantyTicket(db, String(result.insertId));
}

async function updateWarrantyTicket(db, id, input) {
  validateId(id);
  const ticket = normalizeTicket(input);
  let result;
  try {
    [result] = await db.execute(
      'UPDATE warranty_ticket SET ticket_code = ?, status = ? WHERE ticket_id = ?',
      [ticket.ticketCode, ticket.status, id]
    );
  } catch (error) {
    translateDuplicateCode(error);
  }
  if (result.affectedRows === 0) {
    throw new WarrantyTicketError('TICKET_NOT_FOUND', 'Warranty ticket not found');
  }
  return getWarrantyTicket(db, id);
}

async function deleteWarrantyTicket(db, id) {
  validateId(id);
  try {
    const [result] = await db.execute(
      'DELETE FROM warranty_ticket WHERE ticket_id = ?',
      [id]
    );
    if (result.affectedRows === 0) {
      throw new WarrantyTicketError('TICKET_NOT_FOUND', 'Warranty ticket not found');
    }
  } catch (error) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.code === 'ER_ROW_IS_REFERENCED') {
      throw new WarrantyTicketError('TICKET_IN_USE', 'Warranty ticket is referenced by stock transactions');
    }
    throw error;
  }
}

module.exports = {
  WarrantyTicketError,
  createWarrantyTicket,
  deleteWarrantyTicket,
  getWarrantyTicket,
  listWarrantyTickets,
  updateWarrantyTicket
};
