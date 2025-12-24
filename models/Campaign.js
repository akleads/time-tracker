const db = require('../config/database');
const { randomUUID } = require('crypto');

class Campaign {
  static async create(userId, name, slug, fallbackOfferUrl, timezone = 'UTC', domainId = null, fallbackOfferId = null) {
    const id = randomUUID();
    const now = new Date().toISOString();
    
    await db.execute({
      sql: `INSERT INTO campaigns (id, user_id, name, slug, fallback_offer_url, fallback_offer_id, domain_id, timezone, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, userId, name, slug, fallbackOfferUrl, fallbackOfferId, domainId, timezone, now, now]
    });
    
    return this.findById(id);
  }
  
  static async findById(id) {
    try {
      const result = await db.execute({
        sql: `SELECT id, user_id, name, slug, fallback_offer_url, fallback_offer_id, domain_id, timezone, created_at, updated_at
              FROM campaigns WHERE id = ?`,
        args: [id]
      });
      
      return result.rows[0] || null;
    } catch (error) {
      // If columns don't exist yet (migration not run), fall back to basic query
      if (error.message && (error.message.includes('no such column') || error.message.includes('no such table'))) {
        const result = await db.execute({
          sql: `SELECT id, user_id, name, slug, fallback_offer_url, timezone, created_at, updated_at
                FROM campaigns WHERE id = ?`,
          args: [id]
        });
        
        const row = result.rows[0];
        if (!row) return null;
        
        return {
          ...row,
          fallback_offer_id: null,
          domain_id: null
        };
      }
      throw error;
    }
  }
  
  static async findBySlug(slug) {
    try {
      const result = await db.execute({
        sql: `SELECT id, user_id, name, slug, fallback_offer_url, fallback_offer_id, domain_id, timezone, created_at, updated_at
              FROM campaigns WHERE slug = ?`,
        args: [slug]
      });
      
      return result.rows[0] || null;
    } catch (error) {
      // If columns don't exist yet (migration not run), fall back to basic query
      if (error.message && (error.message.includes('no such column') || error.message.includes('no such table'))) {
        const result = await db.execute({
          sql: `SELECT id, user_id, name, slug, fallback_offer_url, timezone, created_at, updated_at
                FROM campaigns WHERE slug = ?`,
          args: [slug]
        });
        
        const row = result.rows[0];
        if (!row) return null;
        
        return {
          ...row,
          fallback_offer_id: null,
          domain_id: null
        };
      }
      throw error;
    }
  }
  
  static async findByUserId(userId) {
    try {
      // Try to select with new columns first
      const result = await db.execute({
        sql: `SELECT id, user_id, name, slug, fallback_offer_url, fallback_offer_id, domain_id, timezone, created_at, updated_at
              FROM campaigns WHERE user_id = ? ORDER BY created_at DESC`,
        args: [userId]
      });
      
      return result.rows;
    } catch (error) {
      // If columns don't exist yet (migration not run), fall back to basic query
      if (error.message && (error.message.includes('no such column') || error.message.includes('no such table'))) {
        const result = await db.execute({
          sql: `SELECT id, user_id, name, slug, fallback_offer_url, timezone, created_at, updated_at
                FROM campaigns WHERE user_id = ? ORDER BY created_at DESC`,
          args: [userId]
        });
        
        // Add null values for missing columns
        return result.rows.map(row => ({
          ...row,
          fallback_offer_id: null,
          domain_id: null
        }));
      }
      throw error;
    }
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
    // Handle fallback_offer_url - can be null to clear it
    if (updates.fallback_offer_url !== undefined) {
      fields.push('fallback_offer_url = ?');
      values.push(updates.fallback_offer_url);
    }
    // Handle fallback_offer_id - can be null to clear it
    if (updates.fallback_offer_id !== undefined) {
      fields.push('fallback_offer_id = ?');
      values.push(updates.fallback_offer_id);
    }
    // Handle domain_id - can be null to clear it
    if (updates.domain_id !== undefined) {
      fields.push('domain_id = ?');
      values.push(updates.domain_id);
    }
    if (updates.timezone) {
      fields.push('timezone = ?');
      values.push(updates.timezone);
    }
    
    // Must have at least one field to update (besides updated_at)
    if (fields.length === 0) {
      throw new Error('No fields to update');
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
