const express = require('express');
const { createTransactionPlan, InventoryError } = require('../services/inventory');

const MAX_ID = 18446744073709551615n;

function isValidId(id) {
  return id.length <= 20 && /^[1-9]\d*$/.test(id) && BigInt(id) <= MAX_ID;
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

function createInventoryRouter() {
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

    const filters = [];
    const values = [];
    if (req.query.centerCode) {
      filters.push('i.center_code = ?');
      values.push(String(req.query.centerCode));
    }
    if (req.query.q) {
      filters.push('(p.part_code LIKE ? OR p.name LIKE ?)');
      values.push(`%${String(req.query.q)}%`, `%${String(req.query.q)}%`);
    }
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    try {
      const [rows] = await req.app.locals.db.execute(
        `SELECT i.inventory_id, i.part_id, i.center_code, i.quantity, i.min_quantity,
                i.updated_at, p.part_code, p.name, p.unit, p.description,
                (i.quantity < i.min_quantity) AS low_stock
         FROM inventory i
         INNER JOIN part p ON p.part_id = i.part_id
         ${where}
         ORDER BY p.part_code, i.center_code
         LIMIT ? OFFSET ?`,
        [...values, pageSize, offset]
      );
      return res.status(200).json({ items: rows, page, pageSize });
    } catch (error) {
      return next(error);
    }
  });

  router.get('/:id', async (req, res, next) => {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ error: 'Inventory id must be a positive integer' });
    }

    try {
      const [rows] = await req.app.locals.db.execute(
        `SELECT i.inventory_id, i.part_id, i.center_code, i.quantity, i.min_quantity,
                i.updated_at, p.part_code, p.name, p.unit, p.description,
                (i.quantity < i.min_quantity) AS low_stock
         FROM inventory i
         INNER JOIN part p ON p.part_id = i.part_id
         WHERE i.inventory_id = ?`,
        [req.params.id]
      );
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Inventory item not found' });
      }
      return res.status(200).json(rows[0]);
    } catch (error) {
      return next(error);
    }
  });

  router.get('/:id/transactions', async (req, res, next) => {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ error: 'Inventory id must be a positive integer' });
    }

    try {
      const [rows] = await req.app.locals.db.execute(
        `SELECT st.transaction_id, st.transaction_type, st.quantity, st.created_at,
                st.created_by, st.note, wt.ticket_id, wt.ticket_code
         FROM stock_transaction st
         LEFT JOIN warranty_ticket wt ON wt.ticket_id = st.ticket_id
         WHERE st.inventory_id = ?
         ORDER BY st.created_at DESC, st.transaction_id DESC
         LIMIT 100`,
        [req.params.id]
      );
      return res.status(200).json(rows);
    } catch (error) {
      return next(error);
    }
  });

  router.post('/:id/transactions', async (req, res, next) => {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ error: 'Inventory id must be a positive integer' });
    }

    const { type, quantity, ticketId, createdBy, note } = req.body || {};
    if (note !== undefined && note !== null && typeof note !== 'string') {
      return res.status(400).json({ error: 'note must be a string or null' });
    }
    if (typeof note === 'string' && note.length > 500) {
      return res.status(400).json({ error: 'note must not exceed 500 characters' });
    }

    let connection;
    try {
      connection = await req.app.locals.db.getConnection();
      await connection.beginTransaction();

      const [inventoryRows] = await connection.execute(
        'SELECT inventory_id, quantity FROM inventory WHERE inventory_id = ? FOR UPDATE',
        [req.params.id]
      );
      if (inventoryRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: 'Inventory item not found' });
      }

      const plan = createTransactionPlan({
        type,
        quantity,
        ticketId,
        createdBy,
        currentStock: inventoryRows[0].quantity
      });

      if (plan.type === 'OUT') {
        const [tickets] = await connection.execute(
          `SELECT ticket_id FROM warranty_ticket
           WHERE ticket_id = ? AND status = 'OPEN'`,
          [plan.ticketId]
        );
        if (tickets.length === 0) {
          await connection.rollback();
          return res.status(404).json({ error: 'Open warranty ticket not found' });
        }
      }

      await connection.execute(
        `UPDATE inventory
         SET quantity = ?, updated_at = CURRENT_TIMESTAMP
         WHERE inventory_id = ?`,
        [plan.newStock, req.params.id]
      );
      const [result] = await connection.execute(
        `INSERT INTO stock_transaction
          (inventory_id, ticket_id, transaction_type, quantity, created_by, note)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [req.params.id, plan.ticketId, plan.type, plan.quantity, plan.createdBy, note || null]
      );

      await connection.commit();
      return res.status(201).json({
        transactionId: result.insertId,
        inventoryId: req.params.id,
        type: plan.type,
        quantity: plan.quantity,
        ticketId: plan.ticketId,
        createdBy: plan.createdBy,
        newStock: plan.newStock
      });
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();
        } catch (rollbackError) {
          return next(new AggregateError([error, rollbackError], 'Inventory transaction and rollback both failed'));
        }
      }
      if (error instanceof InventoryError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      return next(error);
    } finally {
      if (connection) {
        connection.release();
      }
    }
  });

  return router;
}

module.exports = { createInventoryRouter };
