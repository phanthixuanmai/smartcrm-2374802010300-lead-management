const mysql = require('mysql2/promise');

function createPool(options = {}) {
  const requiredSettings = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD'];
  const missingSettings = requiredSettings.filter((setting) => !process.env[setting]);

  if (missingSettings.length > 0) {
    throw new Error(`Missing database configuration: ${missingSettings.join(', ')}`);
  }

  const database = Object.hasOwn(options, 'database') ? options.database : process.env.DB_NAME;
  if (database && !/^[A-Za-z0-9_]+$/.test(database)) {
    throw new Error('DB_NAME must contain only letters, numbers, or underscores');
  }

  return mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    database,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    typeCast(field, next) {
      if (field.type === 'TINY' && field.length === 1) {
        const value = field.string();
        return value === null ? null : value !== '0';
      }

      return next();
    }
  });
}

module.exports = { createPool };
