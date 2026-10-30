const express = require('express');
const {
  WarrantyTicketError,
  createWarrantyTicket,
  deleteWarrantyTicket,
  getWarrantyTicket,
  listWarrantyTickets,
  updateWarrantyTicket
} = require('../services/warranty-tickets');

const WARRANTY_TICKET_ERROR_STATUS = {
  INVALID_ID: 400,
  INVALID_DATA: 400,
  INVALID_STATUS: 400,
  TICKET_NOT_FOUND: 404,
  DUPLICATE_TICKET_CODE: 409,
  TICKET_IN_USE: 409
};

function handleWarrantyTicketError(error, res, next) {
  if (error instanceof WarrantyTicketError) {
    return res.status(WARRANTY_TICKET_ERROR_STATUS[error.code]).json({ error: error.message });
  }
  return next(error);
}

function createWarrantyTicketsRouter() {
  const router = express.Router();

  router.get('/', async (req, res, next) => {
    try {
      const rows = await listWarrantyTickets(req.app.locals.db, req.query.status);
      return res.status(200).json(rows);
    } catch (error) {
      return handleWarrantyTicketError(error, res, next);
    }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      const ticket = await getWarrantyTicket(req.app.locals.db, req.params.id);
      return res.status(200).json(ticket);
    } catch (error) {
      return handleWarrantyTicketError(error, res, next);
    }
  });

  router.post('/', async (req, res, next) => {
    try {
      const ticket = await createWarrantyTicket(req.app.locals.db, req.body);
      return res.status(201).json(ticket);
    } catch (error) {
      return handleWarrantyTicketError(error, res, next);
    }
  });

  router.put('/:id', async (req, res, next) => {
    try {
      const ticket = await updateWarrantyTicket(req.app.locals.db, req.params.id, req.body);
      return res.status(200).json(ticket);
    } catch (error) {
      return handleWarrantyTicketError(error, res, next);
    }
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      await deleteWarrantyTicket(req.app.locals.db, req.params.id);
      return res.status(204).end();
    } catch (error) {
      return handleWarrantyTicketError(error, res, next);
    }
  });

  return router;
}

module.exports = { createWarrantyTicketsRouter };
