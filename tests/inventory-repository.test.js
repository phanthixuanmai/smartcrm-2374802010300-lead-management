const { expect, test } = require('@jest/globals');
const { createInventoryRepository } = require('../src/backend/repositories/inventory');

test('marks stock at or below its minimum as low stock in list and detail queries', async () => {
  const statements = [];
  const db = {
    async execute(sql, values) {
      statements.push({ sql, values });
      return [[], []];
    }
  };
  const repository = createInventoryRepository(db);

  await repository.list({
    centerCode: 'MEKONG-01',
    q: 'PART-001',
    pageSize: 20,
    offset: 0
  });
  await repository.findById('1');

  expect(statements).toHaveLength(2);
  expect(statements[0].sql).toContain('i.center_code = ?');
  expect(statements[0].values).toEqual([
    'MEKONG-01',
    '%PART-001%',
    '%PART-001%',
    20,
    0
  ]);
  for (const { sql } of statements) {
    expect(sql).toMatch(/\(i\.quantity <= i\.min_quantity\) AS low_stock/);
  }
});
