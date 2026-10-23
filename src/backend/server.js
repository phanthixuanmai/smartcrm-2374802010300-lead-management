require('dotenv').config();

const { createApp } = require('./app');
const { createPool } = require('./config/database');

const port = Number(process.env.APP_PORT || 3000);

async function startServer() {
  let pool;

  try {
    pool = createPool();
    await pool.query('SELECT 1');
    console.log('MySQL database connected');

    const server = createApp(pool).listen(port, () => {
      console.log(`Server running... port ${port}`);
    });

    const shutdown = () => {
      server.close(async (error) => {
        if (error) {
          console.error('Server shutdown failed:', error);
          process.exitCode = 1;
        }

        await pool.end();
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    console.error('Server startup failed:', error);
    if (pool) {
      await pool.end();
    }
    process.exitCode = 1;
  }
}

startServer();
