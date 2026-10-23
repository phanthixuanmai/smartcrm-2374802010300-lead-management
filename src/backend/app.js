const express = require('express');
const { createPartsRouter } = require('./routes/parts');

function createApp(db) {
  const app = express();
  app.locals.db = db;
  app.use(express.json());
  app.use('/api/parts', createPartsRouter());

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

    if (error.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Request body must be valid JSON' });
    }

    console.error('Request failed:', error);
    return res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

module.exports = { createApp };
