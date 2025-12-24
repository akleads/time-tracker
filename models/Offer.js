const db = require('../config/database');
const { randomUUID } = require('crypto');

class Offer {
  // Create offer for a user (reusable across campaigns)
  static async create(userId, name, url, priority = 0, campaignId = null) {
    const id = randomUUID();
    const now = new Date().toISOString();
    
    await db.execute({
      sql: `INSERT INTO offers (id, user_id, campaign_id, name, url, priority, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [id, userId, campaignId, name, url, priority, now]
    });
    
    return this.findById(id);
  }
  
  static async findById(id) {
    const result = await db.execute({
      sql: 'SELECT id, user_id, campaign_id, name, url, priority, created_at FROM offers WHERE id = ?',
      args: [id]
    });
    
    return result.rows[0] || null;
  }
  
  // Get all offers for a user (reusable offers library)
  static async findByUserId(userId) {
    const result = await db.execute({
      sql: `SELECT id, user_id, campaign_id, name, url, priority, created_at
            FROM offers WHERE user_id = ? ORDER BY name ASC, created_at ASC`,
      args: [userId]
    });
    
    return result.rows;
  }
  
  // Get offers for a campaign (for backward compatibility and specific campaign offers)
  static async findByCampaignId(campaignId) {
    const result = await db.execute({
      sql: `SELECT id, user_id, campaign_id, name, url, priority, created_at
            FROM offers WHERE campaign_id = ? ORDER BY priority ASC, created_at ASC`,
      args: [campaignId]
    });
    
    return result.rows;
  }
  
  // Get offers used in a campaign (via time rules)
  static async findByCampaignIdViaRules(campaignId) {
    const result = await db.execute({
      sql: `SELECT DISTINCT o.id, o.user_id, o.campaign_id, o.name, o.url, o.priority, o.created_at
            FROM offers o
            INNER JOIN time_rules tr ON o.id = tr.offer_id
            WHERE tr.campaign_id = ?
            ORDER BY o.name ASC`,
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
      sql: `SELECT id FROM offers WHERE id = ? AND user_id = ?`,
      args: [offerId, userId]
    });
    
    return result.rows.length > 0;
  }
}

module.exports = Offer;
