const { expect, test } = require('@jest/globals');
const {
  importCsvData,
  loadImportData,
  parseCsv
} = require('../src/backend/scripts/import-data');

test('parses quoted CSV fields and escaped quotes', () => {
  expect(parseCsv('name,description\r\nPart,"screen, front"\r\nPart 2,"""special"" part"\r\n')).toEqual([
    { name: 'Part', description: 'screen, front' },
    { name: 'Part 2', description: '"special" part' }
  ]);
});

test('loads at most the first 100 parts and transactions', async () => {
  const data = await loadImportData();
  expect(data.parts).toHaveLength(100);
  expect(data.transactions).toHaveLength(100);
  expect(data.centers).toHaveLength(6);
  expect(data.parts[0]).toMatchObject({ part_id: '1', part_code: 'MH-SS-01' });
  expect(data.transactions[0]).toMatchObject({
    transaction_id: '1',
    center_id: '1',
    part_id: '97',
    loai: 'NHAP'
  });
  expect(data.transactions.filter((transaction) => (
    data.parts.some((part) => part.part_id === transaction.part_id)
  ))).toHaveLength(51);
});

test('imports linked records once and builds inventory from imported transactions', async () => {
  const sourceData = await loadImportData();
  const partIds = new Set(sourceData.parts.map((part) => part.part_id));
  const centerIds = new Set(sourceData.centers.map((center) => center.center_id));
  const expectedQuantity = sourceData.transactions
    .filter((transaction) => partIds.has(transaction.part_id) && centerIds.has(transaction.center_id))
    .reduce((sum, transaction) => sum + Number(transaction.so_luong), 0);
  const parts = new Map();
  const centers = new Map();
  const inventory = new Map();
  const importedSources = new Map();
  const transactions = [];
  let nextPartId = 1;
  let nextInventoryId = 1;
  let nextTransactionId = 1;

  const pool = {
    async getConnection() {
      return {
        async beginTransaction() {},
        async commit() {},
        async rollback() {},
        release() {},
        async execute(sql, values = []) {
          if (sql.includes('INSERT INTO service_center')) {
            centers.set(values[0], { center_code: values[0], center_name: values[1], city: values[2] });
            return [{ affectedRows: 1 }, []];
          }
          if (sql.includes('INSERT INTO part')) {
            if (!parts.has(values[0])) {
              parts.set(values[0], {
                part_id: String(nextPartId++),
                part_code: values[0],
                name: values[1],
                unit_price: values[2]
              });
            }
            return [{ affectedRows: 1 }, []];
          }
          if (sql.includes('SELECT part_id, part_code FROM part')) {
            return [[...parts.values()].filter((part) => values.includes(part.part_code)), []];
          }
          if (sql.includes('INSERT INTO inventory')) {
            const key = `${values[0]}:${values[1]}`;
            if (!inventory.has(key)) {
              inventory.set(key, {
                inventory_id: String(nextInventoryId++),
                quantity: values[2],
                min_quantity: values[3],
                updated_at: values[4]
              });
            }
            return [{ affectedRows: 1 }, []];
          }
          if (sql.includes('SELECT inventory_id FROM inventory')) {
            const row = inventory.get(`${values[0]}:${values[1]}`);
            return [row ? [{ inventory_id: row.inventory_id }] : [], []];
          }
          if (sql.includes('SELECT transaction_id FROM imported_transaction_source')) {
            const transactionId = importedSources.get(String(values[0]));
            return [transactionId ? [{ transaction_id: transactionId }] : [], []];
          }
          if (sql.includes('INSERT INTO stock_transaction')) {
            const transaction = { transaction_id: String(nextTransactionId++), values };
            transactions.push(transaction);
            return [{ insertId: transaction.transaction_id }, []];
          }
          if (sql.includes('INSERT INTO imported_transaction_source')) {
            importedSources.set(String(values[0]), String(values[1]));
            return [{ affectedRows: 1 }, []];
          }
          throw new Error(`Unexpected statement: ${sql}`);
        }
      };
    }
  };

  const firstImport = await importCsvData(pool);
  expect(firstImport).toEqual({
    parts: 100,
    centers: 6,
    transactions: 51,
    unmatchedTransactions: 49
  });
  expect(parts.size).toBe(100);
  expect(centers.size).toBe(6);
  expect(transactions).toHaveLength(51);
  expect([...inventory.values()].every((item) => item.min_quantity === 2)).toBe(true);

  const secondImport = await importCsvData(pool);
  expect(secondImport.transactions).toBe(0);
  expect(transactions).toHaveLength(51);
  expect(inventory.size).toBeGreaterThan(0);
  expect([...inventory.values()].reduce((sum, item) => sum + item.quantity, 0))
    .toBe(expectedQuantity);
});
