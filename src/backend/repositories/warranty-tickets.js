function createWarrantyTicketsRepository(db) {
  async function findById(id) {
    const [rows] = await db.execute(
      `SELECT ticket_id, ticket_code, status, created_at
       FROM warranty_ticket WHERE ticket_id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  return {
    async list(status) {
      const [rows] = await db.execute(
        `SELECT ticket_id, ticket_code, status, created_at
         FROM warranty_ticket
         ${status ? 'WHERE status = ?' : ''}
         ORDER BY created_at DESC, ticket_id DESC`,
        status ? [status] : []
      );
      return rows;
    },

    findById,

    async create(ticket) {
      const [result] = await db.execute(
        'INSERT INTO warranty_ticket (ticket_code, status) VALUES (?, ?)',
        [ticket.ticketCode, ticket.status]
      );
      return findById(String(result.insertId));
    },

    async update(id, ticket) {
      const [result] = await db.execute(
        'UPDATE warranty_ticket SET ticket_code = ?, status = ? WHERE ticket_id = ?',
        [ticket.ticketCode, ticket.status, id]
      );
      return result.affectedRows > 0 ? findById(id) : null;
    },

    async delete(id) {
      const [result] = await db.execute('DELETE FROM warranty_ticket WHERE ticket_id = ?', [id]);
      return result.affectedRows > 0;
    }
  };
}

module.exports = { createWarrantyTicketsRepository };
