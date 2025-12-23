const db = require('../config/database');
const { randomUUID } = require('crypto');

class Campaign {
  static async create(userId, name, slug, fallbackOfferUrl, timezone = 'UTC') {
    const id = randomUUID();
    const now = new Date().toISOString();
    
    await db.execute({
      sql: `INSERT INTO campaigns (id, user_id, name, slug, fallback_offer_url, timezone, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, userId, name, slug, fallbackOfferUrl, timezone, now, now]
    });
    
    return this.findById(id);
  }
  
  static async findById(id) {
    const result = await db.execute({
      sql: `SELECT id, user_id, name, slug, fallback_offer_url, timezone, created_at, updated_at
            FROM campaigns WHERE id = ?`,
      args: [id]
    });
    
    return result.rows[0] || null;
  }
  
  static async findBySlug(slug) {
    const result = await db.execute({
      sql: `SELECT id, user_id, name, slug, fallback_offer_url, timezone, created_at, updated_at
            FROM campaigns WHERE slug = ?`,
      args: [slug]
    });
    
    return result.rows[0] || null;
  }
  
  static async findByUserId(userId) {
    const result = await db.execute({
      sql: `SELECT id, user_id, name, slug, fallback_offer_url, timezone, created_at, updated_at
            FROM campaigns WHERE user_id = ? ORDER BY created_at DESC`,
      args: [userId]
    });
    
    return result.rows;
  }
  
  static async update(id, updates) {
    const fields = [];
    const values = [];
    
    if (updates.name) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.slug) {
      fields.push('slug = ?');
      values.push(updates.slug);
    }
    if (updates.fallback_offer_url) {
      fields.push('fallback_offer_url = ?');
      values.push(updates.fallback_offer_url);
    }
    if (updates.timezone) {
      fields.push('timezone = ?');
      values.push(updates.timezone);
    }
    
    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);
    
    await db.execute({
      sql: `UPDATE campaigns SET ${fields.join(', ')} WHERE id = ?`,
      args: values
    });
    
    return this.findById(id);
  }
  
  static async delete(id) {
    await db.execute({
      sql: 'DELETE FROM campaigns WHERE id = ?',
      args: [id]
    });
  }
  
  static async slugExists(slug, excludeId = null) {
    let sql = 'SELECT COUNT(*) as count FROM campaigns WHERE slug = ?';
    const args = [slug];
    
    if (excludeId) {
      sql += ' AND id != ?';
      args.push(excludeId);
    }
    
    const result = await db.execute({ sql, args });
    return result.rows[0].count > 0;
  }
}

module.exports = Campaign;
