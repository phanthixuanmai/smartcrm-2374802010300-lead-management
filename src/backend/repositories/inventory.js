const INVENTORY_SELECT = `SELECT i.inventory_id, i.part_id, i.center_code, i.quantity, i.min_quantity,
                                 i.updated_at, p.part_code, p.name, p.unit, p.unit_price, p.description,
                                 sc.center_name, sc.city, (i.quantity <= i.min_quantity) AS low_stock
                          FROM inventory i
                          INNER JOIN part p ON p.part_id = i.part_id
                          LEFT JOIN service_center sc ON sc.center_code = i.center_code`;

function createInventoryRepository(db) {
  return {
    async list({ centerCode, q, pageSize, offset }) {
      const filters = [];
      const values = [];
      if (centerCode) {
        filters.push('i.center_code = ?');
        values.push(centerCode);
      }
      if (q) {
        filters.push('(p.part_code LIKE ? OR p.name LIKE ?)');
        values.push(`%${q}%`, `%${q}%`);
      }
      const where = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
      const [rows] = await db.execute(
        `${INVENTORY_SELECT}
         ${where}
         ORDER BY p.part_code, i.center_code
         LIMIT ? OFFSET ?`,
        [...values, pageSize, offset]
      );
      return rows;
    },

    async findById(id) {
      const [rows] = await db.execute(
        `${INVENTORY_SELECT}
         WHERE i.inventory_id = ?`,
        [id]
      );
      return rows[0] || null;
    },

    async listTransactions(inventoryId) {
      const [rows] = await db.execute(
        `SELECT st.transaction_id, st.transaction_type, st.quantity, st.created_at,
                st.created_by, st.note, wt.ticket_id, wt.ticket_code
         FROM stock_transaction st
         LEFT JOIN warranty_ticket wt ON wt.ticket_id = st.ticket_id
         WHERE st.inventory_id = ?
         ORDER BY st.created_at DESC, st.transaction_id DESC
         LIMIT 100`,
        [inventoryId]
      );
      return rows;
    },

    async withTransaction(work) {
      const connection = await db.getConnection();
      let transactionStarted = false;
      try {
        await connection.beginTransaction();
        transactionStarted = true;
        const transactionRepository = {
          async lockInventory(inventoryId) {
            const [rows] = await connection.execute(
              'SELECT inventory_id, quantity FROM inventory WHERE inventory_id = ? FOR UPDATE',
              [inventoryId]
            );
            return rows[0] || null;
          },

          async hasOpenTicket(ticketId) {
            const [rows] = await connection.execute(
              `SELECT ticket_id FROM warranty_ticket
               WHERE ticket_id = ? AND status = 'OPEN'`,
              [ticketId]
            );
            return rows.length > 0;
          },

          async updateInventory(inventoryId, quantity) {
            await connection.execute(
              `UPDATE inventory
               SET quantity = ?, updated_at = CURRENT_TIMESTAMP
               WHERE inventory_id = ?`,
              [quantity, inventoryId]
            );
          },

          async insertTransaction({ inventoryId, ticketId, type, quantity, createdBy, note }) {
            const [result] = await connection.execute(
              `INSERT INTO stock_transaction
                (inventory_id, ticket_id, transaction_type, quantity, created_by, note)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [inventoryId, ticketId, type, quantity, createdBy, note]
            );
            return String(result.insertId);
          }
        };
        const result = await work(transactionRepository);
        await connection.commit();
        transactionStarted = false;
        return result;
      } catch (error) {
        if (transactionStarted) {
          try {
            await connection.rollback();
          } catch (rollbackError) {
            throw new AggregateError(
              [error, rollbackError],
              'Inventory transaction and rollback both failed'
            );
          }
        }
        throw error;
      } finally {
        connection.release();
      }
    }
  };
}

module.exports = { createInventoryRepository };
