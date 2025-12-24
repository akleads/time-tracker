const db = require('../config/database');
const { randomUUID } = require('crypto');

class TimeRule {
  static async create(campaignId, offerId, ruleType, startTime, endTime = null, dayOfWeek = null, timezone = null) {
    const id = randomUUID();
    const now = new Date().toISOString();
    
    await db.execute({
      sql: `INSERT INTO time_rules (id, campaign_id, offer_id, rule_type, day_of_week, start_time, end_time, timezone, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, campaignId, offerId, ruleType, dayOfWeek, startTime, endTime, timezone, now]
    });
    
    return this.findById(id);
  }
  
  static async findById(id) {
    const result = await db.execute({
      sql: `SELECT id, campaign_id, offer_id, rule_type, day_of_week, start_time, end_time, timezone, created_at
            FROM time_rules WHERE id = ?`,
      args: [id]
    });
    
    return result.rows[0] || null;
  }
  
  static async findByCampaignId(campaignId) {
    const result = await db.execute({
      sql: `SELECT id, campaign_id, offer_id, rule_type, day_of_week, start_time, end_time, timezone, created_at
            FROM time_rules WHERE campaign_id = ? ORDER BY start_time ASC`,
      args: [campaignId]
    });
    
    return result.rows;
  }
  
  static async findByOfferId(offerId) {
    const result = await db.execute({
      sql: `SELECT id, campaign_id, offer_id, rule_type, day_of_week, start_time, end_time, timezone, created_at
            FROM time_rules WHERE offer_id = ?`,
      args: [offerId]
    });
    
    return result.rows;
  }
  
  static async update(id, updates) {
    const fields = [];
    const values = [];
    
    if (updates.offer_id) {
      fields.push('offer_id = ?');
      values.push(updates.offer_id);
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
