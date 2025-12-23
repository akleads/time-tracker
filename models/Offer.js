const db = require('../config/database');
const { randomUUID } = require('crypto');

class Offer {
  static async create(campaignId, name, url, priority = 0) {
    const id = randomUUID();
    const now = new Date().toISOString();
    
    await db.execute({
      sql: `INSERT INTO offers (id, campaign_id, name, url, priority, created_at)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [id, campaignId, name, url, priority, now]
    });
    
    return this.findById(id);
  }
  
  static async findById(id) {
    const result = await db.execute({
      sql: 'SELECT id, campaign_id, name, url, priority, created_at FROM offers WHERE id = ?',
      args: [id]
    });
    
    return result.rows[0] || null;
  }
  
  static async findByCampaignId(campaignId) {
    const result = await db.execute({
      sql: `SELECT id, campaign_id, name, url, priority, created_at
            FROM offers WHERE campaign_id = ? ORDER BY priority ASC, created_at ASC`,
      args: [campaignId]
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
    if (updates.url) {
      fields.push('url = ?');
      values.push(updates.url);
    }
    if (updates.priority !== undefined) {
      fields.push('priority = ?');
      values.push(updates.priority);
    }
    
    values.push(id);
    
    await db.execute({
      sql: `UPDATE offers SET ${fields.join(', ')} WHERE id = ?`,
      args: values
    });
    
    return this.findById(id);
  }
  
  static async delete(id) {
    await db.execute({
      sql: 'DELETE FROM offers WHERE id = ?',
      args: [id]
    });
  }
  
  static async belongsToUser(offerId, userId) {
    const result = await db.execute({
      sql: `SELECT c.user_id FROM offers o
            JOIN campaigns c ON o.campaign_id = c.id
            WHERE o.id = ? AND c.user_id = ?`,
      args: [offerId, userId]
    });
    
    return result.rows.length > 0;
  }
}

module.exports = Offer;
