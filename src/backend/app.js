const express = require('express');
const cors = require('cors');
const path = require('node:path');
const { createPartsRouter } = require('./routes/parts');
const { createInventoryRouter } = require('./routes/inventory');
const { createWarrantyTicketsRouter } = require('./routes/warranty-tickets');

function createApp(db) {
  const app = express();
  app.locals.db = db;
  const allowedOrigins = (process.env.FRONTEND_ORIGINS
    || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:5500,http://127.0.0.1:5500')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.use(cors({ origin: allowedOrigins }));
  app.use(express.json());
  app.use('/api/parts', createPartsRouter());
  app.use('/api/inventory', createInventoryRouter());
  app.use('/api/warranty-tickets', createWarrantyTicketsRouter());
  app.use(express.static(path.resolve(__dirname, '../frontend')));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      return next();
    }
    return res.sendFile(path.resolve(__dirname, '../frontend/index.html'));
  });

  app.use((error, req, res, next) => {
    if (res.headersSent) {
      return next(error);
    }

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'A part with this part_code already exists' });
    }

    if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.code === 'ER_ROW_IS_REFERENCED') {
      return res.status(409).json({ error: 'Part cannot be deleted because it is in use' });
    }

    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    if (error.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Request body must be valid JSON' });
    }

    console.error('Request failed:', error);
    return res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

module.exports = { createApp };
