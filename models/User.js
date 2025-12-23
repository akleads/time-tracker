const db = require('../config/database');
const { randomUUID } = require('crypto');

class User {
  static async create(username, passwordHash, email = null) {
    const id = randomUUID();
    const now = new Date().toISOString();
    
    await db.execute({
      sql: `INSERT INTO users (id, username, email, password_hash, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [id, username, email, passwordHash, now, now]
    });
    
    return this.findById(id);
  }
  
  static async findById(id) {
    const result = await db.execute({
      sql: 'SELECT id, username, email, password_hash, created_at, updated_at FROM users WHERE id = ?',
      args: [id]
    });
    
    return result.rows[0] || null;
  }
  
  static async findByUsername(username) {
    const result = await db.execute({
      sql: 'SELECT id, username, email, password_hash, created_at, updated_at FROM users WHERE username = ?',
      args: [username]
    });
    
    return result.rows[0] || null;
  }
  
  static async findByEmail(email) {
    const result = await db.execute({
      sql: 'SELECT id, username, email, password_hash, created_at, updated_at FROM users WHERE email = ?',
      args: [email]
    });
    
    return result.rows[0] || null;
  }
  
  static async update(id, updates) {
    const fields = [];
    const values = [];
    
    if (updates.username) {
      fields.push('username = ?');
      values.push(updates.username);
    }
    if (updates.email !== undefined) {
      fields.push('email = ?');
      values.push(updates.email);
    }
    if (updates.password_hash) {
      fields.push('password_hash = ?');
      values.push(updates.password_hash);
    }
    
    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);
    
    await db.execute({
      sql: `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      args: values
    });
    
    return this.findById(id);
  }
}

module.exports = User;
