require('dotenv').config();

const fs = require('node:fs/promises');
const path = require('node:path');
const { createPool } = require('../config/database');

async function initializeDatabase() {
  let adminPool;
  let pool;

  try {
    const databaseName = process.env.DB_NAME || 'smartcrm';
    if (!/^[A-Za-z0-9_]+$/.test(databaseName)) {
      throw new Error('DB_NAME must contain only letters, numbers, or underscores');
    }

    adminPool = createPool({ database: null });
    await adminPool.query(
      `CREATE DATABASE IF NOT EXISTS \`${databaseName}\`
       CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`
    );
    await adminPool.end();
    adminPool = null;

    pool = createPool({ database: databaseName });
    const schemaPath = path.resolve(__dirname, '../../../db/schema.sql');
    const schema = await fs.readFile(schemaPath, 'utf8');
    const statements = schema.split(';').map((statement) => statement.trim()).filter(Boolean);
    for (const statement of statements) {
      await pool.query(statement);
    }
    console.log(`MySQL database "${databaseName}" initialized (5 tables, 3 seed parts)`);
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
