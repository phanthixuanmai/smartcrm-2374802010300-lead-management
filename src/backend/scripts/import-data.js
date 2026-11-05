const fs = require('node:fs/promises');
const path = require('node:path');
const { MIN_INVENTORY_QUANTITY } = require('../constants/inventory');

const IMPORT_LIMIT = 100;
const DEFAULT_DATA_DIRECTORY = path.resolve(__dirname, '../../../data/imports');

function parseCsv(content) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  const text = content.replace(/^\uFEFF/, '');

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"' && field.length === 0) {
      quoted = true;
    } else if (character === ',') {
      row.push(field);
      field = '';
    } else if (character === '\n' || character === '\r') {
      if (character === '\r' && text[index + 1] === '\n') {
        index += 1;
      }
      row.push(field);
      if (row.some((value) => value !== '')) {
        rows.push(row);
      }
      row = [];
      field = '';
    } else {
      field += character;
    }
  }

  if (quoted) {
    throw new Error('CSV contains an unclosed quoted field');
  }
  if (row.length > 0 || field.length > 0) {
    row.push(field);
    rows.push(row);
  }

  if (rows.length === 0) {
    return [];
  }
  const [headers, ...records] = rows;
  return records.slice(0, IMPORT_LIMIT).map((values, index) => {
    if (values.length !== headers.length) {
      throw new Error(`CSV record ${index + 1} has ${values.length} fields; expected ${headers.length}`);
    }
    return Object.fromEntries(headers.map((header, column) => [header, values[column]]));
  });
}

async function readCsv(filePath) {
  return parseCsv(await fs.readFile(filePath, 'utf8'));
}

function requiredValue(record, key, fileName) {
  const value = record[key];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${fileName} contains an empty ${key} value`);
  }
  return value.trim();
}

function positiveInteger(value, label) {
  if (!/^[1-9]\d*$/.test(String(value))) {
    throw new Error(`${label} must be a positive integer`);
  }
  return Number(value);
}

function validateData({ parts, transactions, centers }) {
  const partIds = new Set();
  for (const part of parts) {
    const id = positiveInteger(requiredValue(part, 'part_id', 'parts.csv'), 'part_id');
    if (partIds.has(id)) {
      throw new Error(`parts.csv contains duplicate part_id ${id}`);
    }
    partIds.add(id);
    requiredValue(part, 'part_code', 'parts.csv');
    requiredValue(part, 'part_name', 'parts.csv');
    const price = Number(part.unit_price);
    if (!Number.isFinite(price) || price < 0) {
      throw new Error(`parts.csv contains an invalid unit_price for part_id ${id}`);
    }
  }

  const centerIds = new Set();
  const centerCodes = new Set();
  for (const center of centers) {
    const id = positiveInteger(requiredValue(center, 'center_id', 'service_centers.csv'), 'center_id');
    const code = requiredValue(center, 'center_code', 'service_centers.csv');
    if (centerIds.has(id) || centerCodes.has(code)) {
      throw new Error(`service_centers.csv contains a duplicate center id or code`);
    }
    centerIds.add(id);
    centerCodes.add(code);
    requiredValue(center, 'center_name', 'service_centers.csv');
    requiredValue(center, 'thanh_pho', 'service_centers.csv');
  }

  for (const transaction of transactions) {
    positiveInteger(requiredValue(transaction, 'transaction_id', 'part_transactions.csv'), 'transaction_id');
    positiveInteger(requiredValue(transaction, 'center_id', 'part_transactions.csv'), 'center_id');
    positiveInteger(requiredValue(transaction, 'part_id', 'part_transactions.csv'), 'part_id');
    positiveInteger(requiredValue(transaction, 'so_luong', 'part_transactions.csv'), 'so_luong');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(requiredValue(transaction, 'ngay', 'part_transactions.csv'))) {
      throw new Error('part_transactions.csv contains a date outside YYYY-MM-DD format');
    }
    if (!['NHAP', 'XUAT'].includes(requiredValue(transaction, 'loai', 'part_transactions.csv'))) {
      throw new Error(`part_transactions.csv contains an unsupported transaction type`);
    }
  }
}

async function loadImportData(dataDirectory = DEFAULT_DATA_DIRECTORY) {
  const [parts, transactions, centers] = await Promise.all([
    readCsv(path.join(dataDirectory, 'parts.csv')),
    readCsv(path.join(dataDirectory, 'part_transactions.csv')),
    readCsv(path.join(dataDirectory, 'service_centers.csv'))
  ]);
  validateData({ parts, transactions, centers });
  return { parts, transactions, centers };
}

function inventoryKey(partId, centerCode) {
  return `${partId}:${centerCode}`;
}

async function importCsvData(pool, dataDirectory = DEFAULT_DATA_DIRECTORY) {
  const { parts, transactions, centers } = await loadImportData(dataDirectory);
  const sourcePartIds = new Set(parts.map((part) => String(part.part_id)));
  const sourceCenterIds = new Set(centers.map((center) => String(center.center_id)));
  const applicableTransactions = transactions.filter((transaction) => (
    sourcePartIds.has(String(transaction.part_id))
    && sourceCenterIds.has(String(transaction.center_id))
  ));
  const unmatchedTransactions = transactions.length - applicableTransactions.length;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    for (const center of centers) {
      await connection.execute(
        `INSERT INTO service_center (center_code, center_name, city)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE center_name = VALUES(center_name), city = VALUES(city)`,
        [center.center_code.trim(), center.center_name.trim(), center.thanh_pho.trim()]
      );
    }

    for (const part of parts) {
      await connection.execute(
        `INSERT INTO part (part_code, name, unit, unit_price, description)
         VALUES (?, ?, 'cái', ?, NULL)
         ON DUPLICATE KEY UPDATE name = VALUES(name), unit_price = VALUES(unit_price)`,
        [part.part_code.trim(), part.part_name.trim(), Number(part.unit_price)]
      );
    }

    const [partRows] = await connection.execute(
      `SELECT part_id, part_code FROM part WHERE part_code IN (${parts.map(() => '?').join(', ')})`,
      parts.map((part) => part.part_code.trim())
    );
    const partIdsByCode = new Map(partRows.map((row) => [row.part_code, String(row.part_id)]));
    const partIdsBySourceId = new Map();
    for (const part of parts) {
      const partId = partIdsByCode.get(part.part_code.trim());
      if (!partId) {
        throw new Error(`Could not resolve imported part ${part.part_code}`);
      }
      partIdsBySourceId.set(String(part.part_id), partId);
    }
    const centerCodesBySourceId = new Map(
      centers.map((center) => [String(center.center_id), center.center_code.trim()])
    );

    const inventory = new Map();
    for (const transaction of applicableTransactions) {
      const partId = partIdsBySourceId.get(String(transaction.part_id));
      const centerCode = centerCodesBySourceId.get(String(transaction.center_id));
      const key = inventoryKey(partId, centerCode);
      const current = inventory.get(key);
      inventory.set(key, {
        partId,
        centerCode,
        quantity: (current ? current.quantity : 0) + Number(transaction.so_luong),
        updatedAt: current && current.updatedAt > transaction.ngay
          ? current.updatedAt
          : transaction.ngay
      });
    }

    const inventoryIds = new Map();
    for (const [key, item] of inventory) {
      await connection.execute(
        `INSERT INTO inventory (part_id, center_code, quantity, min_quantity, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE inventory_id = inventory_id`,
        [
          item.partId,
          item.centerCode,
          item.quantity,
          MIN_INVENTORY_QUANTITY,
          `${item.updatedAt} 00:00:00`
        ]
      );
      const [rows] = await connection.execute(
        'SELECT inventory_id FROM inventory WHERE part_id = ? AND center_code = ?',
        [item.partId, item.centerCode]
      );
      if (rows.length !== 1) {
        throw new Error(`Could not resolve inventory row for part ${item.partId} at ${item.centerCode}`);
      }
      inventoryIds.set(key, String(rows[0].inventory_id));
    }

    let importedTransactions = 0;
    for (const transaction of applicableTransactions) {
      const [existing] = await connection.execute(
        'SELECT transaction_id FROM imported_transaction_source WHERE source_transaction_id = ?',
        [transaction.transaction_id]
      );
      if (existing.length > 0) {
        continue;
      }

      const partId = partIdsBySourceId.get(String(transaction.part_id));
      const centerCode = centerCodesBySourceId.get(String(transaction.center_id));
      const inventoryId = inventoryIds.get(inventoryKey(partId, centerCode));
      let ticketId = null;
      if (transaction.loai === 'XUAT') {
        const ticketCode = transaction.ticket_code.trim();
        if (!ticketCode) {
          throw new Error(`Transaction ${transaction.transaction_id} is XUAT but has no ticket_code`);
        }
        await connection.execute(
          `INSERT INTO warranty_ticket (ticket_code, status)
           VALUES (?, 'OPEN')
           ON DUPLICATE KEY UPDATE ticket_code = VALUES(ticket_code)`,
          [ticketCode]
        );
        const [tickets] = await connection.execute(
          'SELECT ticket_id FROM warranty_ticket WHERE ticket_code = ?',
          [ticketCode]
        );
        ticketId = tickets[0].ticket_id;
      }

      const [result] = await connection.execute(
        `INSERT INTO stock_transaction
          (inventory_id, ticket_id, transaction_type, quantity, created_at, created_by)
         VALUES (?, ?, ?, ?, ?, 'CSV import')`,
        [
          inventoryId,
          ticketId,
          transaction.loai === 'NHAP' ? 'IN' : 'OUT',
          Number(transaction.so_luong),
          `${transaction.ngay} 00:00:00`
        ]
      );
      await connection.execute(
        `INSERT INTO imported_transaction_source (source_transaction_id, transaction_id)
         VALUES (?, ?)`,
        [transaction.transaction_id, result.insertId]
      );
      importedTransactions += 1;
    }

    await connection.commit();
    return {
      parts: parts.length,
      centers: centers.length,
      transactions: importedTransactions,
      unmatchedTransactions
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { IMPORT_LIMIT, importCsvData, loadImportData, parseCsv };
