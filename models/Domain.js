const db = require('../config/database');
const { randomUUID } = require('crypto');

class Domain {
  static async create(domain) {
    try {
      const id = randomUUID();
      const now = new Date().toISOString();
      
      await db.execute({
        sql: `INSERT INTO domains (id, domain, is_active, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?)`,
        args: [id, domain, 1, now, now]
      });
      
      return this.findById(id);
    } catch (error) {
      console.error('Error in Domain.create:', error);
      throw error;
    }
  }
  
  static async findById(id) {
    const result = await db.execute({
      sql: 'SELECT id, domain, is_active, created_at, updated_at FROM domains WHERE id = ?',
      args: [id]
    });
    
    return result.rows[0] || null;
  }
  
  static async findByDomain(domain) {
    const result = await db.execute({
      sql: 'SELECT id, domain, is_active, created_at, updated_at FROM domains WHERE domain = ? AND is_active = 1',
      args: [domain]
    });
    
    return result.rows[0] || null;
  }
  
  static async findAll() {
    const result = await db.execute({
      sql: 'SELECT id, domain, is_active, created_at, updated_at FROM domains ORDER BY domain ASC',
      args: []
    });
    
    return result.rows.map(row => ({
      ...row,
      is_active: row.is_active === 1 || row.is_active === true
    }));
  }
  
  static async update(id, updates) {
    const fields = [];
    const values = [];
    
    if (updates.domain) {
      fields.push('domain = ?');
      values.push(updates.domain);
    }
    if (updates.is_active !== undefined) {
      fields.push('is_active = ?');
      values.push(updates.is_active ? 1 : 0);
    }
    
    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);
    
    await db.execute({
      sql: `UPDATE domains SET ${fields.join(', ')} WHERE id = ?`,
      args: values
    });
    
    return this.findById(id);
  }
  
  static async delete(id) {
    await db.execute({
      sql: 'DELETE FROM domains WHERE id = ?',
      args: [id]
    });
  }
}

module.exports = Domain;

