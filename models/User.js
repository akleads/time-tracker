const db = require('../config/database');
const { randomUUID } = require('crypto');

class User {
  static async create(username, passwordHash, email = null, isAdmin = false, isVerified = false) {
    const id = randomUUID();
    const now = new Date().toISOString();
    
    // If username is "alex", make them admin and verified
    if (username.toLowerCase() === 'alex') {
      isAdmin = true;
      isVerified = true;
    }
    
    await db.execute({
      sql: `INSERT INTO users (id, username, email, password_hash, is_admin, is_verified, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, username, email, passwordHash, isAdmin ? 1 : 0, isVerified ? 1 : 0, now, now]
    });
    
    return this.findById(id);
  }
  
  static async findById(id) {
    const result = await db.execute({
      sql: 'SELECT id, username, email, password_hash, is_admin, is_verified, created_at, updated_at FROM users WHERE id = ?',
      args: [id]
    });
    
    return this._mapUser(result.rows[0]);
  }
  
  static async findByUsername(username) {
    const result = await db.execute({
      sql: 'SELECT id, username, email, password_hash, is_admin, is_verified, created_at, updated_at FROM users WHERE username = ?',
      args: [username]
    });
    
    return this._mapUser(result.rows[0]);
  }
  
  static async findByEmail(email) {
    const result = await db.execute({
      sql: 'SELECT id, username, email, password_hash, is_admin, is_verified, created_at, updated_at FROM users WHERE email = ?',
      args: [email]
    });
    
    return this._mapUser(result.rows[0]);
  }
  
  static async findAllUnverified() {
    const result = await db.execute({
      sql: 'SELECT id, username, email, is_admin, is_verified, created_at, updated_at FROM users WHERE is_verified = 0 ORDER BY created_at ASC'
    });
    
    return result.rows.map(row => this._mapUser(row));
  }
  
  static _mapUser(row) {
    if (!row) return null;
    return {
      ...row,
      is_admin: row.is_admin === 1 || row.is_admin === true,
      is_verified: row.is_verified === 1 || row.is_verified === true
    };
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
    if (updates.is_admin !== undefined) {
      fields.push('is_admin = ?');
      values.push(updates.is_admin ? 1 : 0);
    }
    if (updates.is_verified !== undefined) {
      fields.push('is_verified = ?');
      values.push(updates.is_verified ? 1 : 0);
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
  
  static async delete(id) {
    await db.execute({
      sql: 'DELETE FROM users WHERE id = ?',
      args: [id]
    });
  }
}

module.exports = User;
