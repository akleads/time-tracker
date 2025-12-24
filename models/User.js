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
    try {
      // Simplified query - get all users first, then filter in JavaScript if needed
      // This avoids potential SQL syntax issues with NULL comparisons
      const result = await db.execute({
        sql: 'SELECT id, username, email, is_admin, is_verified, created_at, updated_at FROM users ORDER BY created_at ASC'
      });
      
      console.log('findAllUnverified - Raw result rows count:', result.rows?.length || 0);
      
      // Filter for unverified, non-admin users
      const unverifiedUsers = result.rows
        .filter(row => {
          const isVerified = row.is_verified === 1 || row.is_verified === true || row.is_verified === '1';
          const isAdmin = row.is_admin === 1 || row.is_admin === true || row.is_admin === '1';
          return !isVerified && !isAdmin;
        })
        .map(row => this._mapUser(row))
        .filter(user => user !== null); // Filter out any null values
      
      console.log('findAllUnverified - Filtered unverified users count:', unverifiedUsers.length);
      
      return unverifiedUsers;
    } catch (error) {
      console.error('Error in findAllUnverified:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        name: error.name,
        stack: error.stack
      });
      throw error;
    }
  }
  
  static _mapUser(row) {
    if (!row) return null;
    try {
      const mapped = {
        id: row.id,
        username: row.username,
        email: row.email,
        is_admin: row.is_admin === 1 || row.is_admin === true || row.is_admin === '1',
        is_verified: row.is_verified === 1 || row.is_verified === true || row.is_verified === '1',
        created_at: row.created_at,
        updated_at: row.updated_at
      };
      
      // Only include password_hash if it's in the row (for methods that select it)
      if (row.password_hash !== undefined) {
        mapped.password_hash = row.password_hash;
      }
      
      return mapped;
    } catch (error) {
      console.error('Error in _mapUser:', error, 'Row:', row);
      return null;
    }
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
