const { expect, test } = require('@jest/globals');
const { createInventoryRepository } = require('../src/backend/repositories/inventory');

test('marks stock at or below its minimum as low stock in list and detail queries', async () => {
  const statements = [];
  const db = {
    async execute(sql) {
      statements.push(sql);
      return [[], []];
    }
  };
  const repository = createInventoryRepository(db);

  await repository.list({ pageSize: 20, offset: 0 });
  await repository.findById('1');

  expect(statements).toHaveLength(2);
  for (const statement of statements) {
    expect(statement).toMatch(/\(i\.quantity <= i\.min_quantity\) AS low_stock/);
  }
});
