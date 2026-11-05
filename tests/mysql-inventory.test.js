require('dotenv').config();

const fs = require('node:fs/promises');
const path = require('node:path');
const mysql = require('mysql2/promise');
const {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test
} = require('@jest/globals');
const { createApp } = require('../src/backend/app');

const databaseName = process.env.TEST_DB_NAME;
const configuredDatabase = process.env.DB_NAME || process.env.MYSQLDATABASE || 'smartcrm';
const testHost = process.env.TEST_DB_HOST;
const testPort = Number(process.env.TEST_DB_PORT || 3306);
const testUser = process.env.TEST_DB_USER;
const testPassword = process.env.TEST_DB_PASSWORD;
const validDatabaseName = typeof databaseName === 'string'
  && /^[A-Za-z0-9_]+$/.test(databaseName)
  && /_test$/i.test(databaseName)
  && databaseName.toLowerCase() !== configuredDatabase.toLowerCase();
const validTestHost = ['localhost', '127.0.0.1', '::1'].includes(
  typeof testHost === 'string' ? testHost.toLowerCase() : ''
);
const validTestPort = Number.isInteger(testPort) && testPort > 0 && testPort <= 65535;

if (databaseName && (!validDatabaseName || !validTestHost || !validTestPort
  || !testUser || !testPassword)) {
  throw new Error(
    'MySQL integration tests require a separate *_test database, a local TEST_DB_HOST, '
    + 'and TEST_DB_USER/TEST_DB_PASSWORD credentials'
  );
}

const integration = databaseName ? describe : describe.skip;
const credentials = { username: 'test-admin', password: 'test-password' };
const tableResetOrder = [
  'stock_alert',
  'imported_transaction_source',
  'stock_transaction',
  'inventory',
  'warranty_ticket',
  'service_center',
  'part'
];

let db;
let server;
let baseUrl;
let cookie;
let fixture;

async function resetDb() {
  for (const table of tableResetOrder) {
    await db.query(`DELETE FROM \`${table}\``);
  }
}

async function seed() {
  const [partResult] = await db.execute(
    `INSERT INTO part (part_code, name, unit, unit_price)
     VALUES (?, ?, ?, ?)`,
    ['IT-PART-001', 'Integration part', 'piece', 100]
  );
  await db.execute(
    `INSERT INTO service_center (center_code, center_name, city)
     VALUES (?, ?, ?), (?, ?, ?)`,
    ['IT-CENTER-A', 'Integration Center A', 'Test City A',
      'IT-CENTER-B', 'Integration Center B', 'Test City B']
  );
  await db.execute(
    `INSERT INTO inventory (part_id, center_code, quantity, min_quantity)
     VALUES (?, ?, ?, ?), (?, ?, ?, ?)`,
    [partResult.insertId, 'IT-CENTER-A', 5, 3,
      partResult.insertId, 'IT-CENTER-B', 9, 2]
  );
  const [ticketResult] = await db.execute(
    `INSERT INTO warranty_ticket (ticket_code, status)
     VALUES (?, 'OPEN')`,
    ['IT-TICKET-001']
  );
  const [inventoryRows] = await db.execute(
    `SELECT inventory_id, center_code
     FROM inventory
     WHERE part_id = ?
     ORDER BY center_code`,
    [partResult.insertId]
  );

  return {
    ticketId: String(ticketResult.insertId),
    inventoryA: String(inventoryRows.find((row) => row.center_code === 'IT-CENTER-A').inventory_id),
    inventoryB: String(inventoryRows.find((row) => row.center_code === 'IT-CENTER-B').inventory_id)
  };
}

async function readCookie() {
  const login = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  });
  if (!login.ok) {
    throw new Error(`Test login failed with status ${login.status}`);
  }
  cookie = login.headers.get('set-cookie').split(';')[0];
}

async function request(pathname, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set('Cookie', cookie);
  return fetch(`${baseUrl}${pathname}`, { ...options, headers });
}

integration('MySQL inventory integration', () => {
  beforeAll(async () => {
    db = mysql.createPool({
      host: testHost,
      port: testPort,
      user: testUser,
      password: testPassword,
      database: databaseName,
      waitForConnections: true,
      connectionLimit: 5,
      typeCast(field, next) {
        if (field.type === 'TINY' && field.length === 1) {
          const value = field.string();
          return value === null ? null : value !== '0';
        }

        return next();
      }
    });
    const schema = await fs.readFile(path.resolve(__dirname, '../db/schema.sql'), 'utf8');
    for (const statement of schema.split(';').map((item) => item.trim()).filter(Boolean)) {
      await db.query(statement);
    }

    server = createApp(db, { auth: credentials }).listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
    await readCookie();
  });

  beforeEach(async () => {
    await resetDb();
    fixture = await seed();
  });

  afterAll(async () => {
    try {
      if (db) {
        await resetDb();
      }
    } finally {
      if (server) {
        server.closeAllConnections();
        await new Promise((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
        });
      }
      if (db) {
        await db.end();
      }
    }
  });

  test('filters stock by center and persists a ticket-linked withdrawal on only that row', async () => {
    const filtered = await request('/api/inventory?centerCode=IT-CENTER-A');
    expect(filtered.status).toBe(200);
    const filteredBody = await filtered.json();
    expect(filteredBody.items).toHaveLength(1);
    expect(filteredBody.items[0].center_code).toBe('IT-CENTER-A');

    const withdrawal = await request(`/api/inventory/${fixture.inventoryA}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'OUT',
        quantity: 2,
        ticketId: fixture.ticketId,
        createdBy: 'integration-test'
      })
    });
    expect(withdrawal.status).toBe(201);
    expect((await withdrawal.json()).newStock).toBe(3);

    const [stocks] = await db.execute(
      `SELECT inventory_id, center_code, quantity, min_quantity
       FROM inventory
       ORDER BY center_code`
    );
    expect(stocks).toMatchObject([
      { center_code: 'IT-CENTER-A', quantity: 3, min_quantity: 3 },
      { center_code: 'IT-CENTER-B', quantity: 9, min_quantity: 2 }
    ]);

    const [transactions] = await db.execute(
      `SELECT inventory_id, ticket_id, transaction_type, quantity
       FROM stock_transaction`
    );
    expect(transactions).toHaveLength(1);
    expect(String(transactions[0].inventory_id)).toBe(fixture.inventoryA);
    expect(String(transactions[0].ticket_id)).toBe(fixture.ticketId);
    expect(transactions[0]).toMatchObject({ transaction_type: 'OUT', quantity: 2 });

    const updatedInventory = await request(`/api/inventory/${fixture.inventoryA}`);
    expect((await updatedInventory.json()).low_stock).toBe(true);
  });

  test('rejects an over-stock withdrawal without changing MySQL rows', async () => {
    const [beforeTransactions] = await db.execute(
      'SELECT COUNT(*) AS count FROM stock_transaction'
    );
    const response = await request(`/api/inventory/${fixture.inventoryA}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'OUT',
        quantity: 6,
        ticketId: fixture.ticketId,
        createdBy: 'integration-test'
      })
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      error: 'Insufficient stock for this withdrawal'
    });
    const [stocks] = await db.execute(
      'SELECT quantity FROM inventory WHERE inventory_id = ?',
      [fixture.inventoryA]
    );
    const [afterTransactions] = await db.execute(
      'SELECT COUNT(*) AS count FROM stock_transaction'
    );
    expect(stocks[0].quantity).toBe(5);
    expect(afterTransactions[0].count).toBe(beforeTransactions[0].count);
  });
});
