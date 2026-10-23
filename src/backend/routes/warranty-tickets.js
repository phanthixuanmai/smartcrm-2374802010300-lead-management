const express = require('express');

function createWarrantyTicketsRouter() {
  const router = express.Router();

  router.get('/', async (req, res, next) => {
    try {
      const status = req.query.status ? String(req.query.status).toUpperCase() : null;
      if (status && !['OPEN', 'CLOSED', 'CANCELLED'].includes(status)) {
        return res.status(400).json({ error: 'status must be OPEN, CLOSED, or CANCELLED' });
      }

      const [rows] = await req.app.locals.db.execute(
        `SELECT ticket_id, ticket_code, status, created_at
         FROM warranty_ticket
         ${status ? 'WHERE status = ?' : ''}
         ORDER BY created_at DESC, ticket_id DESC`,
        status ? [status] : []
      );
      return res.status(200).json(rows);
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

module.exports = { createWarrantyTicketsRouter };
