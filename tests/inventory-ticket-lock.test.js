const fs = require('node:fs/promises');
const path = require('node:path');
const mysql = require('mysql2/promise');
const { afterAll, beforeAll, describe, expect, test } = require('@jest/globals');
const { createApp } = require('../src/backend/app');

const databaseName = process.env.TEST_DB_NAME;
const host = process.env.TEST_DB_HOST;
const port = Number(process.env.TEST_DB_PORT || 3306);
const user = process.env.TEST_DB_USER;
const password = process.env.TEST_DB_PASSWORD;
const validDatabase = typeof databaseName === 'string'
  && /^[A-Za-z0-9_]+$/.test(databaseName)
  && /_test$/i.test(databaseName);
const validHost = ['localhost', '127.0.0.1', '::1'].includes(
  typeof host === 'string' ? host.toLowerCase() : ''
);

if (databaseName && (!validDatabase || !validHost || !user || !password)) {
  throw new Error('Ticket-lock test requires a separate *_test database on loopback');
}

const integration = databaseName ? describe : describe.skip;
const credentials = { username: 'ticket-lock-test', password: 'test-password' };
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

let db;
let server;
let cookie;
let fixture;
let releaseTicketCheck;
let ticketCheckReached;
let signalTicketCheckReached;

integration('inventory ticket concurrency', () => {
  beforeAll(async () => {
    db = mysql.createPool({
      host,
      port,
      user,
      password,
      database: databaseName,
      connectionLimit: 5
    });

    const schema = await fs.readFile(path.resolve(__dirname, '../db/schema.sql'), 'utf8');
    for (const statement of schema.split(';').map((item) => item.trim()).filter(Boolean)) {
      await db.query(statement);
    }

    const suffix = Date.now().toString();
    const partCode = `LOCK-${suffix}`;
    const ticketCode = `LOCK-${suffix}`;
    const [part] = await db.execute(
      'INSERT INTO part (part_code, name, unit) VALUES (?, ?, ?)',
      [partCode, 'Ticket lock test part', 'piece']
    );
    const centerCode = `LOCK-${suffix}`;
    await db.execute(
      'INSERT INTO service_center (center_code, center_name, city) VALUES (?, ?, ?)',
      [centerCode, 'Ticket Lock Test Center', 'Test City']
    );
    const [inventory] = await db.execute(
      'INSERT INTO inventory (part_id, center_code, quantity, min_quantity) VALUES (?, ?, 2, 0)',
      [part.insertId, centerCode]
    );
    const [ticket] = await db.execute(
      'INSERT INTO warranty_ticket (ticket_code, status) VALUES (?, ?)',
      [ticketCode, 'OPEN']
    );
    fixture = {
      inventoryId: String(inventory.insertId),
      ticketId: String(ticket.insertId),
      partCode,
      centerCode,
      ticketCode
    };

    const wrappedDb = {
      execute: (...args) => db.execute(...args),
      async getConnection() {
        const connection = await db.getConnection();
        return new Proxy(connection, {
          get(target, property) {
            if (property === 'execute') {
              return async (sql, values) => {
                const result = await target.execute(sql, values);
                if (sql.includes('FROM warranty_ticket') && sql.includes("status = 'OPEN'")) {
                  signalTicketCheckReached();
                  await new Promise((resolve) => {
                    releaseTicketCheck = resolve;
                  });
                }
                return result;
              };
            }
            const value = Reflect.get(target, property);
            return typeof value === 'function' ? value.bind(target) : value;
          }
        });
      }
    };

    server = createApp(wrappedDb, { auth: credentials }).listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const login = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    cookie = login.headers.get('set-cookie').split(';')[0];
    fixture.baseUrl = baseUrl;
  });

  afterAll(async () => {
    if (releaseTicketCheck) {
      releaseTicketCheck();
    }
    if (db && fixture) {
      await db.execute('DELETE FROM stock_transaction WHERE inventory_id = ?', [fixture.inventoryId]);
      await db.execute('DELETE FROM inventory WHERE inventory_id = ?', [fixture.inventoryId]);
      await db.execute('DELETE FROM warranty_ticket WHERE ticket_id = ?', [fixture.ticketId]);
      await db.execute('DELETE FROM service_center WHERE center_code = ?', [fixture.centerCode]);
      await db.execute('DELETE FROM part WHERE part_code = ?', [fixture.partCode]);
      await db.execute('DELETE FROM warranty_ticket WHERE ticket_code = ?', [fixture.ticketCode]);
    }
    if (server) {
      server.closeAllConnections();
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
    if (db) {
      await db.end();
    }
  });

  test('outgoing transaction serializes with closing its warranty ticket', async () => {
    ticketCheckReached = new Promise((resolve) => {
      signalTicketCheckReached = resolve;
    });

    const withdrawalPromise = fetch(
      `${fixture.baseUrl}/api/inventory/${fixture.inventoryId}/transactions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({
          type: 'OUT',
          quantity: 1,
          ticketId: fixture.ticketId,
          createdBy: 'ticket-lock-test'
        })
      }
    );
    let ticketCheckTimeout;
    try {
      await Promise.race([
        ticketCheckReached,
        new Promise((resolve, reject) => {
          ticketCheckTimeout = setTimeout(
            () => reject(new Error('Withdrawal did not validate the warranty ticket')),
            5000
          );
        })
      ]);
    } finally {
      clearTimeout(ticketCheckTimeout);
    }

    let ticketCloseCompleted = false;
    const ticketClosePromise = db.execute(
      'UPDATE warranty_ticket SET status = ? WHERE ticket_id = ?',
      ['CLOSED', fixture.ticketId]
    ).then(() => {
      ticketCloseCompleted = true;
    });
    await wait(100);
    const ticketCloseWasBlocked = !ticketCloseCompleted;

    releaseTicketCheck();
    const withdrawal = await withdrawalPromise;
    await ticketClosePromise;
    const [transactions] = await db.execute(
      'SELECT ticket_id, transaction_type FROM stock_transaction WHERE inventory_id = ?',
      [fixture.inventoryId]
    );

    expect(ticketCloseWasBlocked).toBe(true);
    expect(withdrawal.status).toBe(201);
    expect(transactions).toMatchObject([
      { ticket_id: Number(fixture.ticketId), transaction_type: 'OUT' }
    ]);
  }, 15000);
});
