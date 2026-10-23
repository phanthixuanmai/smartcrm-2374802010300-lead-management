const express = require('express');

const requiredTextFields = ['part_code', 'name', 'unit'];
const allowedFields = [...requiredTextFields, 'description', 'is_active'];

function validatePart(body) {
  const errors = [];

  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return ['request body must be a JSON object'];
  }

  for (const field of requiredTextFields) {
    if (typeof body[field] !== 'string' || body[field].trim() === '') {
      errors.push(`${field} is required and must be a non-empty string`);
    }
  }

  if (body.description !== undefined && body.description !== null
    && typeof body.description !== 'string') {
    errors.push('description must be a string or null');
  }

  if (body.is_active !== undefined && typeof body.is_active !== 'boolean') {
    errors.push('is_active must be a boolean');
  }

  const unexpectedFields = Object.keys(body).filter((field) => !allowedFields.includes(field));
  if (unexpectedFields.length > 0) {
    errors.push(`Unexpected fields: ${unexpectedFields.join(', ')}`);
  }

  return errors;
}

function normalizePart(body) {
  return {
    partCode: body.part_code.trim(),
    name: body.name.trim(),
    unit: body.unit.trim(),
    description: body.description === undefined ? null : body.description,
    isActive: body.is_active === undefined ? true : body.is_active
  };
}

function createPartsRouter() {
  const router = express.Router();
  const isValidId = (id) => /^[1-9]\d*$/.test(id)
    && BigInt(id) <= 18446744073709551615n;

  router.get('/', async (req, res, next) => {
    try {
      const [rows] = await req.app.locals.db.execute(
        `SELECT part_id, part_code, name, unit, description, is_active
         FROM part
         ORDER BY part_id`
      );
      res.status(200).json(rows);
    } catch (error) {
      next(error);
    }
  });

  router.get('/:id', async (req, res, next) => {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ error: 'Part id must be a positive integer' });
    }

    try {
      const [rows] = await req.app.locals.db.execute(
        `SELECT part_id, part_code, name, unit, description, is_active
         FROM part
         WHERE part_id = ?`,
        [req.params.id]
      );

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Part not found' });
      }

      return res.status(200).json(rows[0]);
    } catch (error) {
      return next(error);
    }
  });

  router.post('/', async (req, res, next) => {
    const errors = validatePart(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Invalid part data', details: errors });
    }

    const part = normalizePart(req.body);
    try {
      const [result] = await req.app.locals.db.execute(
        `INSERT INTO part (part_code, name, unit, description, is_active)
         VALUES (?, ?, ?, ?, ?)`,
        [part.partCode, part.name, part.unit, part.description, part.isActive]
      );
      const [rows] = await req.app.locals.db.execute(
        `SELECT part_id, part_code, name, unit, description, is_active
         FROM part
         WHERE part_id = ?`,
        [result.insertId]
      );
      return res.status(201).json(rows[0]);
    } catch (error) {
      return next(error);
    }
  });

  router.put('/:id', async (req, res, next) => {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ error: 'Part id must be a positive integer' });
    }

    const errors = validatePart(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Invalid part data', details: errors });
    }

    const part = normalizePart(req.body);
    try {
      const [existing] = await req.app.locals.db.execute(
        'SELECT part_id FROM part WHERE part_id = ?',
        [req.params.id]
      );
      if (existing.length === 0) {
        return res.status(404).json({ error: 'Part not found' });
      }

      await req.app.locals.db.execute(
        `UPDATE part
         SET part_code = ?, name = ?, unit = ?, description = ?, is_active = ?
         WHERE part_id = ?`,
        [part.partCode, part.name, part.unit, part.description, part.isActive, req.params.id]
      );

      const [rows] = await req.app.locals.db.execute(
        `SELECT part_id, part_code, name, unit, description, is_active
         FROM part
         WHERE part_id = ?`,
        [req.params.id]
      );
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Part not found' });
      }

      return res.status(200).json(rows[0]);
    } catch (error) {
      return next(error);
    }
  });

  router.delete('/:id', async (req, res, next) => {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ error: 'Part id must be a positive integer' });
    }

    try {
      const [result] = await req.app.locals.db.execute(
        'DELETE FROM part WHERE part_id = ?',
        [req.params.id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Part not found' });
      }

      return res.status(204).end();
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

module.exports = { createPartsRouter };
