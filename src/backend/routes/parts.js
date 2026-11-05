const express = require('express');
const { PartError } = require('../services/parts');

const PART_ERROR_STATUS = {
  INVALID_ID: 400,
  INVALID_DATA: 400,
  PART_NOT_FOUND: 404,
  DUPLICATE_PART_CODE: 409
};

function handlePartError(error, res, next) {
  if (error instanceof PartError) {
    return res.status(PART_ERROR_STATUS[error.code]).json({
      error: error.message,
      ...(error.code === 'INVALID_DATA' ? { details: [error.message] } : {})
    });
  }
  return next(error);
}

function createPartsRouter(service) {
  const router = express.Router();

  router.get('/', async (req, res, next) => {
    try {
      return res.status(200).json(await service.list());
    } catch (error) {
      return handlePartError(error, res, next);
    }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      return res.status(200).json(await service.get(req.params.id));
    } catch (error) {
      return handlePartError(error, res, next);
    }
  });

  router.post('/', async (req, res, next) => {
    try {
      return res.status(201).json(await service.create(req.body));
    } catch (error) {
      return handlePartError(error, res, next);
    }
  });

  router.put('/:id', async (req, res, next) => {
    try {
      return res.status(200).json(await service.update(req.params.id, req.body));
    } catch (error) {
      return handlePartError(error, res, next);
    }
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      await service.delete(req.params.id);
      return res.status(204).end();
    } catch (error) {
      return handlePartError(error, res, next);
    }
  });

  return router;
}

module.exports = { createPartsRouter };
