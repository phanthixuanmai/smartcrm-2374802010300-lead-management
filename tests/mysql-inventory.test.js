const fs = require('node:fs/promises');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
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
let schemaReady = false;
let fixtureResetStarted = false;

async function resetDb() {
  for (const table of tableResetOrder) {
    await db.query(`DELETE FROM \`${table}\``);
  }
}

async function countRows(table) {
  const [rows] = await db.query(`SELECT COUNT(*) AS count FROM \`${table}\``);
  return Number(rows[0].count);
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
    schemaReady = true;

    server = createApp(db, { auth: credentials }).listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
    await readCookie();
  });

  beforeEach(async () => {
    fixtureResetStarted = true;
    await resetDb();
    fixture = await seed();
    console.log(`[SETUP] resetDb + seed: inventory A=${fixture.inventoryA} stock=5; inventory B=${fixture.inventoryB} stock=9; open ticket=${fixture.ticketId}`);
  });

  afterAll(async () => {
    try {
      if (db && schemaReady && fixtureResetStarted) {
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

  test('TC-02 happy path: persists ticket-linked stock withdrawal to MySQL', async () => {
    const beforeTransactions = await countRows('stock_transaction');
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
        quantity: 4,
        ticketId: fixture.ticketId,
        createdBy: 'integration-test'
      })
    });
    const body = await withdrawal.json();
    expect(withdrawal.status).toBe(201);
    expect(body.newStock).toBe(1);

    const [stocks] = await db.execute(
      `SELECT inventory_id, center_code, quantity, min_quantity
       FROM inventory
       ORDER BY center_code`
    );
    expect(stocks).toMatchObject([
      { center_code: 'IT-CENTER-A', quantity: 1, min_quantity: 3 },
      { center_code: 'IT-CENTER-B', quantity: 9, min_quantity: 2 }
    ]);

    const [transactions] = await db.execute(
      `SELECT inventory_id, ticket_id, transaction_type, quantity
       FROM stock_transaction`
    );
    expect(transactions).toHaveLength(1);
    expect(String(transactions[0].inventory_id)).toBe(fixture.inventoryA);
    expect(String(transactions[0].ticket_id)).toBe(fixture.ticketId);
    expect(transactions[0]).toMatchObject({ transaction_type: 'OUT', quantity: 4 });

    const updatedInventory = await request(`/api/inventory/${fixture.inventoryA}`);
    const updatedBody = await updatedInventory.json();
    const afterTransactions = await countRows('stock_transaction');
    expect(updatedBody.low_stock).toBe(1);
    expect(afterTransactions).toBe(beforeTransactions + 1);
    console.log(`[RESULT] HTTP ${withdrawal.status}; quantity=4; DB stock=1; transaction count ${beforeTransactions}->${afterTransactions}; low_stock=${updatedBody.low_stock}`);
  });

  test('TC-04 upper boundary: rejects one above stock without changing MySQL rows', async () => {
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
    console.log(`[RESULT] HTTP ${response.status}; error=Insufficient stock for this withdrawal; DB stock=5; transaction count ${beforeTransactions[0].count}->${afterTransactions[0].count}`);
  });

  test('TC-01 happy path: creates a part and reads persisted values from MySQL', async () => {
    const before = await countRows('part');
    const response = await request('/api/parts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        part_code: 'BT2-PART-VALID',
        name: 'BT2 integration part',
        unit: 'piece',
        unit_price: 12345
      })
    });
    const body = await response.json();
    const [rows] = await db.execute(
      'SELECT part_code, name, unit, unit_price FROM part WHERE part_code = ?',
      ['BT2-PART-VALID']
    );
    const after = await countRows('part');

    expect(response.status).toBe(201);
    expect(body).toMatchObject({ part_code: 'BT2-PART-VALID', name: 'BT2 integration part' });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      part_code: body.part_code,
      name: body.name,
      unit: body.unit
    });
    expect(Number(rows[0].unit_price)).toBe(12345);
    expect(after).toBe(before + 1);
    console.log(`[RESULT] HTTP ${response.status}; part=${body.part_code}; DB part count ${before}->${after}; persisted value matches response`);
  });

  test('TC-03 lower boundary: accepts withdrawal exactly equal to available stock', async () => {
    const beforeTransactions = await countRows('stock_transaction');
    const response = await request(`/api/inventory/${fixture.inventoryA}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'OUT',
        quantity: 5,
        ticketId: fixture.ticketId,
        createdBy: 'integration-test'
      })
    });
    const body = await response.json();
    const [stocks] = await db.execute('SELECT quantity FROM inventory WHERE inventory_id = ?', [fixture.inventoryA]);
    const afterTransactions = await countRows('stock_transaction');

    expect(response.status).toBe(201);
    expect(body.newStock).toBe(0);
    expect(stocks[0].quantity).toBe(0);
    expect(afterTransactions).toBe(beforeTransactions + 1);
    console.log(`[RESULT] HTTP ${response.status}; quantity=5; DB stock=0; transaction count ${beforeTransactions}->${afterTransactions}`);
  });

  test('TC-05 invalid data: blank required part name returns field-specific 400 without insert', async () => {
    const before = await countRows('part');
    const response = await request('/api/parts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ part_code: 'BT2-PART-NONAME', name: '  ', unit: 'piece' })
    });
    const body = await response.json();
    const after = await countRows('part');

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/name is required/);
    expect(after).toBe(before);
    console.log(`[RESULT] HTTP ${response.status}; error=${body.error}; DB part count ${before}->${after}`);
  });

  test('TC-06 invalid id: missing part returns 404 rather than 500', async () => {
    const before = await countRows('part');
    const response = await request('/api/parts/999999999');
    const body = await response.json();
    const after = await countRows('part');

    expect(response.status).toBe(404);
    expect(body.error).toBe('Part not found');
    expect(after).toBe(before);
    console.log(`[RESULT] HTTP ${response.status}; error=${body.error}; DB part count ${before}->${after}; not HTTP 500`);
  });

  test('TC-07 data integrity: duplicate part code returns 409 without extra row', async () => {
    const before = await countRows('part');
    const response = await request('/api/parts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        part_code: 'IT-PART-001',
        name: 'Duplicate integration part',
        unit: 'piece',
        unit_price: 100
      })
    });
    const body = await response.json();
    const after = await countRows('part');
    const [matches] = await db.execute('SELECT COUNT(*) AS count FROM part WHERE part_code = ?', ['IT-PART-001']);

    expect(response.status).toBe(409);
    expect(body.error).toMatch(/already exists/);
    expect(after).toBe(before);
    expect(Number(matches[0].count)).toBe(1);
    console.log(`[RESULT] HTTP ${response.status}; error=${body.error}; DB part count ${before}->${after}; duplicate-code rows=${matches[0].count}`);
  });

  test('TC-08 invalid data: zero transaction quantity returns 400 with no side effect', async () => {
    const beforeTransactions = await countRows('stock_transaction');
    const response = await request(`/api/inventory/${fixture.inventoryA}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'IN', quantity: 0, createdBy: 'integration-test' })
    });
    const body = await response.json();
    const afterTransactions = await countRows('stock_transaction');
    const [stocks] = await db.execute('SELECT quantity FROM inventory WHERE inventory_id = ?', [fixture.inventoryA]);

    expect(response.status).toBe(400);
    expect(body.error).toBe('quantity must be a positive integer');
    expect(afterTransactions).toBe(beforeTransactions);
    expect(stocks[0].quantity).toBe(5);
    console.log(`[RESULT] HTTP ${response.status}; error=${body.error}; transaction count ${beforeTransactions}->${afterTransactions}; stock=5`);
  });

  test('TC-09 data integrity: missing warranty ticket does not write transaction', async () => {
    const beforeTransactions = await countRows('stock_transaction');
    const response = await request(`/api/inventory/${fixture.inventoryA}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'OUT',
        quantity: 1,
        ticketId: '999999999',
        createdBy: 'integration-test'
      })
    });
    const body = await response.json();
    const afterTransactions = await countRows('stock_transaction');
    const [stocks] = await db.execute('SELECT quantity FROM inventory WHERE inventory_id = ?', [fixture.inventoryA]);

    expect(response.status).toBe(404);
    expect(body.error).toBe('Open warranty ticket not found');
    expect(afterTransactions).toBe(beforeTransactions);
    expect(stocks[0].quantity).toBe(5);
    console.log(`[RESULT] HTTP ${response.status}; error=${body.error}; transaction count ${beforeTransactions}->${afterTransactions}; stock=5`);
  });

  test('TC-10 security: unauthenticated part modification is denied without changing rows', async () => {
    const before = await countRows('part');
    const response = await fetch(`${baseUrl}/api/parts/1`, {
      method: 'DELETE'
    });
    const body = await response.json();
    const after = await countRows('part');

    expect(response.status).toBe(401);
    expect(after).toBe(before);
    console.log(`[RESULT] HTTP ${response.status}; error=${body.error}; DB part count ${before}->${after}; cross-user 403 N/A (single shared configured account)`);
  });

  test('TC-11 data quality: injection-like search stays data and changes no records', async () => {
    const beforeTransactions = await countRows('stock_transaction');
    const beforeParts = await countRows('part');
    const payload = "' OR 1=1 --";
    const response = await request(`/api/inventory?q=${encodeURIComponent(payload)}`);
    const body = await response.json();
    const afterTransactions = await countRows('stock_transaction');
    const afterParts = await countRows('part');

    expect(response.status).toBe(200);
    expect(body.items).toHaveLength(0);
    expect(afterTransactions).toBe(beforeTransactions);
    expect(afterParts).toBe(beforeParts);
    console.log(`[RESULT] HTTP ${response.status}; items=${body.items.length}; part count ${beforeParts}->${afterParts}; transaction count ${beforeTransactions}->${afterTransactions}`);
  });

  test('TC-12 repeatability: migration and seed run twice with stable row counts', async () => {
    const appEnv = {
      ...process.env,
      DB_HOST: testHost,
      DB_PORT: String(testPort),
      DB_NAME: databaseName,
      DB_USER: testUser,
      DB_PASSWORD: testPassword,
      DB_CREATE_DATABASE: 'false'
    };
    const initScript = path.resolve(__dirname, '../src/backend/scripts/init-db.js');
    const runInitialization = () => execFileSync(process.execPath, [initScript], {
      cwd: path.resolve(__dirname, '..'),
      env: appEnv,
      encoding: 'utf8',
      timeout: 60000,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    const countImportedRows = async () => ({
      parts: await countRows('part'),
      centers: await countRows('service_center'),
      inventory: await countRows('inventory'),
      transactions: await countRows('stock_transaction')
    });

    const firstOutput = runInitialization();
    const firstCounts = await countImportedRows();
    const secondOutput = runInitialization();
    const secondCounts = await countImportedRows();

    expect(firstOutput).toMatch(/initialized/);
    expect(secondOutput).toMatch(/initialized/);
    expect(secondCounts).toEqual(firstCounts);
    console.log(`[RESULT] init-db exit 0 twice; row counts after first=${JSON.stringify(firstCounts)}; after second=${JSON.stringify(secondCounts)}`);
  });
});
