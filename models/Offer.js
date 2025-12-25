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
  // This includes offers with user_id set directly, as well as offers from campaigns owned by the user (for backward compatibility)
  static async findByUserId(userId) {
    const result = await db.execute({
      sql: `SELECT DISTINCT o.id, o.user_id, o.campaign_id, o.name, o.url, o.priority, o.created_at
            FROM offers o
            LEFT JOIN campaigns c ON o.campaign_id = c.id
            WHERE o.user_id = ? OR (o.user_id IS NULL AND c.user_id = ?)
            ORDER BY o.name ASC, o.created_at ASC`,
      args: [userId, userId]
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
    // Check if offer belongs to user either directly via user_id or via campaign ownership
    // For reusable offers (campaign_id is NULL), user_id must match
    // For campaign-specific offers (campaign_id is set), check via campaign ownership if user_id is NULL
    const result = await db.execute({
      sql: `SELECT o.id 
            FROM offers o
            LEFT JOIN campaigns c ON o.campaign_id = c.id
            WHERE o.id = ? AND (
              o.user_id = ? 
              OR (o.user_id IS NULL AND o.campaign_id IS NOT NULL AND c.user_id = ?)
            )`,
      args: [offerId, userId, userId]
    });
    
    const belongs = result.rows.length > 0;
    
    // Debug logging
    if (!belongs) {
      const offerResult = await db.execute({
        sql: 'SELECT id, user_id, campaign_id FROM offers WHERE id = ?',
        args: [offerId]
      });
      const offer = offerResult.rows[0];
      console.log('belongsToUser check failed:', {
        offerId,
        userId,
        offer: offer ? { id: offer.id, user_id: offer.user_id, campaign_id: offer.campaign_id } : null
      });
    }
    
    return belongs;
  }
}

module.exports = Offer;
