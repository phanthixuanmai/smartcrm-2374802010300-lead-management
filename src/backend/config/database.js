const mysql = require('mysql2/promise');

function createPool(options = {}) {
  const host = process.env.DB_HOST || process.env.MYSQLHOST;
  const port = process.env.DB_PORT || process.env.MYSQLPORT;
  const user = process.env.DB_USER || process.env.MYSQLUSER;
  const password = process.env.DB_PASSWORD || process.env.MYSQLPASSWORD;
  const missingSettings = [
    !host && 'DB_HOST (or MYSQLHOST)',
    !port && 'DB_PORT (or MYSQLPORT)',
    !user && 'DB_USER (or MYSQLUSER)',
    !password && 'DB_PASSWORD (or MYSQLPASSWORD)'
  ].filter(Boolean);

  if (missingSettings.length > 0) {
    throw new Error(`Missing database configuration: ${missingSettings.join(', ')}`);
  }

  const database = Object.hasOwn(options, 'database')
    ? options.database
    : process.env.DB_NAME || process.env.MYSQLDATABASE;
  if (database && !/^[A-Za-z0-9_]+$/.test(database)) {
    throw new Error('DB_NAME must contain only letters, numbers, or underscores');
  }

  return mysql.createPool({
    host,
    port: Number(port),
    database,
    user,
    password,
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
