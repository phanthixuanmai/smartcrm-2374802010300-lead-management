require('dotenv').config();

const fs = require('node:fs/promises');
const path = require('node:path');
const { createPool } = require('../config/database');
const { importCsvData } = require('./import-data');
const { MIN_INVENTORY_QUANTITY } = require('../constants/inventory');

async function initializeDatabase() {
  let adminPool;
  let pool;

  try {
    const databaseName = process.env.DB_NAME || process.env.MYSQLDATABASE || 'smartcrm';
    if (!/^[A-Za-z0-9_]+$/.test(databaseName)) {
      throw new Error('DB_NAME must contain only letters, numbers, or underscores');
    }

    if ((process.env.DB_CREATE_DATABASE || 'true').toLowerCase() !== 'false') {
      adminPool = createPool({ database: null });
      await adminPool.query(
        `CREATE DATABASE IF NOT EXISTS \`${databaseName}\`
         CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`
      );
      await adminPool.end();
      adminPool = null;
    }

    pool = createPool({ database: databaseName });
    const schemaPath = path.resolve(__dirname, '../../../db/schema.sql');
    const schema = await fs.readFile(schemaPath, 'utf8');
    const statements = schema.split(';').map((statement) => statement.trim()).filter(Boolean);
    for (const statement of statements) {
      await pool.query(statement);
    }
    const [priceColumn] = await pool.query(
      `SELECT COUNT(*) AS count
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'part' AND COLUMN_NAME = 'unit_price'`
    );
    if (Number(priceColumn[0].count) === 0) {
      await pool.query('ALTER TABLE part ADD COLUMN unit_price DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER unit');
    }

    const seedPath = path.resolve(__dirname, '../../../db/init/01-seed.sql');
    const seed = await fs.readFile(seedPath, 'utf8');
    const seedStatements = seed.split(';').map((statement) => statement.trim()).filter(Boolean);
    for (const statement of seedStatements) {
      await pool.query(statement);
    }

    await pool.query(
      `ALTER TABLE inventory
       MODIFY COLUMN min_quantity INTEGER NOT NULL DEFAULT ${MIN_INVENTORY_QUANTITY}
       CHECK (min_quantity >= 0)`
    );
    await pool.execute(
      'UPDATE inventory SET min_quantity = ? WHERE min_quantity <> ?',
      [MIN_INVENTORY_QUANTITY, MIN_INVENTORY_QUANTITY]
    );

    const result = await importCsvData(pool);
    console.log(
      `MySQL database "${databaseName}" initialized ` +
      `(${result.parts} parts, ${result.centers} service centers, ` +
      `${result.transactions} imported transactions, ` +
      `${result.unmatchedTransactions} transactions skipped because their part or center is outside the import limit)`
    );
  } catch (error) {
    console.error('MySQL database initialization failed:', error);
    process.exitCode = 1;
  } finally {
    if (adminPool) {
      await adminPool.end();
    }
    if (pool) {
      await pool.end();
    }
  }
}

initializeDatabase();
