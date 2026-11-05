const express = require('express');
const { InventoryError } = require('../services/inventory');

const INVENTORY_ERROR_STATUS = {
  INVALID_INVENTORY_ID: 400,
  INVALID_TRANSACTION_TYPE: 400,
  INVALID_QUANTITY: 400,
  INVALID_ACTOR: 400,
  INVALID_NOTE: 400,
  MISSING_TICKET: 400,
  INVALID_TICKET_ID: 400,
  INVENTORY_NOT_FOUND: 404,
  TICKET_NOT_FOUND: 404,
  INSUFFICIENT_STOCK: 409,
  QUANTITY_LIMIT_EXCEEDED: 409
};

function handleInventoryError(error, res, next) {
  if (error instanceof InventoryError) {
    return res.status(INVENTORY_ERROR_STATUS[error.code] || 400).json({ error: error.message });
  }
  return next(error);
}

function parsePositiveInteger(value, fallback, maximum) {
  if (value === undefined) {
    return fallback;
  }
  if (!/^[1-9]\d*$/.test(String(value))) {
    return null;
  }
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed <= maximum ? parsed : null;
}

function createInventoryRouter(service) {
  const router = express.Router();

  router.get('/', async (req, res, next) => {
    const page = parsePositiveInteger(req.query.page, 1, 1000000);
    const pageSize = parsePositiveInteger(req.query.pageSize, 20, 100);
    if (page === null || pageSize === null) {
      return res.status(400).json({ error: 'page must be positive and pageSize must be between 1 and 100' });
    }

    const offset = (page - 1) * pageSize;
    if (!Number.isSafeInteger(offset)) {
      return res.status(400).json({ error: 'page is out of range' });
    }

    try {
      const items = await service.list({
        centerCode: req.query.centerCode ? String(req.query.centerCode) : undefined,
        q: req.query.q ? String(req.query.q) : undefined,
        pageSize,
        offset
      });
      return res.status(200).json({ items, page, pageSize });
    } catch (error) {
      return handleInventoryError(error, res, next);
    }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      return res.status(200).json(await service.get(req.params.id));
    } catch (error) {
      return handleInventoryError(error, res, next);
    }
  });

  router.get('/:id/transactions', async (req, res, next) => {
    try {
      return res.status(200).json(await service.listTransactions(req.params.id));
    } catch (error) {
      return handleInventoryError(error, res, next);
    }
  });

  router.post('/:id/transactions', async (req, res, next) => {
    try {
      return res.status(201).json(await service.createTransaction(req.params.id, req.body));
    } catch (error) {
      return handleInventoryError(error, res, next);
    }
  });

  return router;
}

module.exports = { createInventoryRouter };
