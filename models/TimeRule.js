const db = require('../config/database');
const { randomUUID } = require('crypto');

class TimeRule {
  static async create(campaignId, offerPosition, ruleType, startTime, endTime = null, dayOfWeek = null, timezone = null, weight = 100) {
    const id = randomUUID();
    const now = new Date().toISOString();
    
    await db.execute({
      sql: `INSERT INTO time_rules (id, campaign_id, offer_position, rule_type, day_of_week, start_time, end_time, timezone, weight, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, campaignId, offerPosition, ruleType, dayOfWeek, startTime, endTime, timezone, weight || 100, now]
    });
    
    return this.findById(id);
  }
  
  static async findById(id) {
    const result = await db.execute({
      sql: `SELECT id, campaign_id, offer_id, offer_position, rule_type, day_of_week, start_time, end_time, timezone, weight, created_at
            FROM time_rules WHERE id = ?`,
      args: [id]
    });
    
    return result.rows[0] || null;
  }
  
  static async findByCampaignId(campaignId) {
    const result = await db.execute({
      sql: `SELECT id, campaign_id, offer_id, offer_position, rule_type, day_of_week, start_time, end_time, timezone, weight, created_at
            FROM time_rules WHERE campaign_id = ? ORDER BY start_time ASC`,
      args: [campaignId]
    });
    
    return result.rows;
  }
  
  static async findByOfferId(offerId) {
    const result = await db.execute({
      sql: `SELECT id, campaign_id, offer_id, rule_type, day_of_week, start_time, end_time, timezone, weight, created_at
            FROM time_rules WHERE offer_id = ?`,
      args: [offerId]
    });
    
    return result.rows;
  }
  
  static async deleteByOfferId(offerId) {
    const result = await db.execute({
      sql: 'DELETE FROM time_rules WHERE offer_id = ?',
      args: [offerId]
    });
    // Return the number of deleted rows (SQLite doesn't directly return this, but we can check before deletion)
    const countResult = await db.execute({
      sql: 'SELECT COUNT(*) as count FROM time_rules WHERE offer_id = ?',
      args: [offerId]
    });
    return 0; // Rules are now deleted, return 0 (we'll get count before deletion)
  }
  
  static async update(id, updates) {
    const fields = [];
    const values = [];
    
    if (updates.offer_position !== undefined) {
      fields.push('offer_position = ?');
      values.push(updates.offer_position);
    }
    if (updates.campaign_id) {
      fields.push('campaign_id = ?');
      values.push(updates.campaign_id);
    }
    if (updates.rule_type) {
      fields.push('rule_type = ?');
      values.push(updates.rule_type);
    }
    if (updates.day_of_week !== undefined) {
      fields.push('day_of_week = ?');
      values.push(updates.day_of_week);
    }
    if (updates.start_time) {
      fields.push('start_time = ?');
      values.push(updates.start_time);
    }
    if (updates.end_time !== undefined) {
      fields.push('end_time = ?');
      values.push(updates.end_time);
    }
    if (updates.timezone !== undefined) {
      fields.push('timezone = ?');
      values.push(updates.timezone);
    }
    if (updates.weight !== undefined) {
      fields.push('weight = ?');
      values.push(updates.weight);
    }
    
    values.push(id);
    
    await db.execute({
      sql: `UPDATE time_rules SET ${fields.join(', ')} WHERE id = ?`,
      args: values
    });
    
    return this.findById(id);
  }
  
  static async delete(id) {
    await db.execute({
      sql: 'DELETE FROM time_rules WHERE id = ?',
      args: [id]
    });
  }
}

module.exports = TimeRule;
