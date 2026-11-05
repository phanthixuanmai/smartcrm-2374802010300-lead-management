function createPartsRepository(db) {
  async function findById(id) {
    const [rows] = await db.execute(
      `SELECT part_id, part_code, name, unit, unit_price, description, is_active
       FROM part
       WHERE part_id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  return {
    async list() {
      const [rows] = await db.execute(
        `SELECT part_id, part_code, name, unit, unit_price, description, is_active
         FROM part
         ORDER BY part_id`
      );
      return rows;
    },

    findById,

    async create(part) {
      const [result] = await db.execute(
        `INSERT INTO part (part_code, name, unit, unit_price, description, is_active)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [part.partCode, part.name, part.unit, part.unitPrice, part.description, part.isActive]
      );
      return findById(String(result.insertId));
    },

    async update(id, part) {
      const [result] = await db.execute(
        `UPDATE part
         SET part_code = ?, name = ?, unit = ?, unit_price = ?, description = ?, is_active = ?
         WHERE part_id = ?`,
        [part.partCode, part.name, part.unit, part.unitPrice, part.description, part.isActive, id]
      );
      return result.affectedRows > 0 ? findById(id) : null;
    },

    async delete(id) {
      const [result] = await db.execute('DELETE FROM part WHERE part_id = ?', [id]);
      return result.affectedRows > 0;
    }
  };
}

module.exports = { createPartsRepository };
