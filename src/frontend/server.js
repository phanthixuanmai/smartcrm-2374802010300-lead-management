require('dotenv').config();

const express = require('express');
const path = require('node:path');

const app = express();
const frontendDirectory = __dirname;
const frontendPort = Number(process.env.FRONTEND_PORT || 5173);

app.use(express.static(frontendDirectory));
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDirectory, 'index.html'));
});

const server = app.listen(frontendPort, '127.0.0.1', () => {
  console.log(`Frontend running... port ${frontendPort}`);
});

server.on('error', (error) => {
  console.error('Frontend startup failed:', error);
  process.exitCode = 1;
});
