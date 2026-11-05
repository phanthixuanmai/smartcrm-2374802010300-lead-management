const express = require('express');
const cors = require('cors');
const path = require('node:path');
const { createPartsRouter } = require('./routes/parts');
const { createInventoryRouter } = require('./routes/inventory');
const { createWarrantyTicketsRouter } = require('./routes/warranty-tickets');
const { createAuth } = require('./auth');
const { createAuthRouter } = require('./routes/auth');
const { createPartsRepository } = require('./repositories/parts');
const { createInventoryRepository } = require('./repositories/inventory');
const { createWarrantyTicketsRepository } = require('./repositories/warranty-tickets');
const { createPartsService } = require('./services/parts');
const { createInventoryService } = require('./services/inventory');

function createApp(db, options = {}) {
  const app = express();
  const partsRepository = createPartsRepository(db);
  const inventoryRepository = createInventoryRepository(db);
  const warrantyTicketsRepository = createWarrantyTicketsRepository(db);
  const auth = createAuth(options.auth || {
    username: process.env.AUTH_USERNAME,
    password: process.env.AUTH_PASSWORD
  });
  const allowedOrigins = (process.env.FRONTEND_ORIGINS
    || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:5500,http://127.0.0.1:5500')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.use(cors({ origin: allowedOrigins, credentials: true }));
  app.use(express.json());
  app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));
  app.use('/api/auth', createAuthRouter(auth));
  app.use('/api/parts', auth.requireAuth, createPartsRouter(createPartsService(partsRepository)));
  app.use('/api/inventory', auth.requireAuth, createInventoryRouter(createInventoryService(inventoryRepository)));
  app.use('/api/warranty-tickets', auth.requireAuth, createWarrantyTicketsRouter(warrantyTicketsRepository));
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
