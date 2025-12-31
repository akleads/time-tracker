const db = require('../config/database');
const { randomUUID } = require('crypto');

class Redirect {
  static async create(data) {
    const id = randomUUID();
    const now = new Date().toISOString();
    
    // Try to insert with offer_position (new schema)
    try {
      await db.execute({
        sql: `INSERT INTO redirects (
          id, campaign_id, offer_id, offer_position, redirected_to_url,
          utm_source, utm_medium, utm_campaign, utm_term, utm_content,
          ip_address, user_agent, referrer, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id,
          data.campaign_id,
          data.offer_id || null,
          data.offer_position || null,
          data.redirected_to_url,
          data.utm_source || null,
          data.utm_medium || null,
          data.utm_campaign || null,
          data.utm_term || null,
          data.utm_content || null,
          data.ip_address || null,
          data.user_agent || null,
          data.referrer || null,
          now
        ]
      });
      
      return id;
    } catch (error) {
      // If offer_position column doesn't exist, fall back to old schema
      if (error.message && error.message.includes('no such column: offer_position')) {
        await db.execute({
          sql: `INSERT INTO redirects (
            id, campaign_id, offer_id, redirected_to_url,
            utm_source, utm_medium, utm_campaign, utm_term, utm_content,
            ip_address, user_agent, referrer, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            id,
            data.campaign_id,
            data.offer_id || null,
            data.redirected_to_url,
            data.utm_source || null,
            data.utm_medium || null,
            data.utm_campaign || null,
            data.utm_term || null,
            data.utm_content || null,
            data.ip_address || null,
            data.user_agent || null,
            data.referrer || null,
            now
          ]
        });
        
        return id;
      }
      throw error;
    }
  }
  
  static async getCampaignStats(campaignId, startDate = null, endDate = null) {
    // Try new schema with offer_position first
    try {
      let sql = `
        SELECT 
          COUNT(*) as total_clicks,
          COUNT(CASE WHEN offer_position IS NULL THEN 1 END) as fallback_clicks,
          COUNT(DISTINCT DATE(created_at)) as unique_days
        FROM redirects
        WHERE campaign_id = ?
      `;
      const args = [campaignId];
      
      if (startDate) {
        sql += ' AND created_at >= ?';
        args.push(startDate);
      }
      if (endDate) {
        sql += ' AND created_at <= ?';
        args.push(endDate);
      }
      
      const result = await db.execute({ sql, args });
      return result.rows[0];
    } catch (error) {
      // Fall back to old schema if offer_position doesn't exist
      if (error.message && error.message.includes('no such column: offer_position')) {
        let sql = `
          SELECT 
            COUNT(*) as total_clicks,
            COUNT(CASE WHEN offer_id IS NULL THEN 1 END) as fallback_clicks,
            COUNT(DISTINCT DATE(created_at)) as unique_days
          FROM redirects
          WHERE campaign_id = ?
        `;
        const args = [campaignId];
        
        if (startDate) {
          sql += ' AND created_at >= ?';
          args.push(startDate);
        }
        if (endDate) {
          sql += ' AND created_at <= ?';
          args.push(endDate);
        }
        
        const result = await db.execute({ sql, args });
        return result.rows[0];
      }
      throw error;
    }
  }
  
  static async getPositionStats(campaignId, startDate = null, endDate = null) {
    // Get clicks by offer position
    try {
      let sql = `
        SELECT 
          offer_position,
          COUNT(*) as clicks
        FROM redirects
        WHERE campaign_id = ?
      `;
      const args = [campaignId];
      
      if (startDate) {
        sql += ' AND created_at >= ?';
        args.push(startDate);
      }
      if (endDate) {
        sql += ' AND created_at <= ?';
        args.push(endDate);
      }
      
      sql += ' GROUP BY offer_position ORDER BY offer_position ASC';
      
      const result = await db.execute({ sql, args });
      
      // Format results: position -> clicks, and include fallback (null position)
      const stats = {};
      result.rows.forEach(row => {
        const position = row.offer_position !== null ? row.offer_position : 'fallback';
        stats[position] = row.clicks;
      });
      
      return stats;
    } catch (error) {
      // If offer_position column doesn't exist, return empty stats
      if (error.message && error.message.includes('no such column: offer_position')) {
        return {};
      }
      throw error;
    }
  }
  
  static async getOfferStats(campaignId, startDate = null, endDate = null) {
    let sql = `
      SELECT 
        o.id as offer_id,
        o.name as offer_name,
        COUNT(r.id) as clicks
      FROM offers o
      LEFT JOIN redirects r ON o.id = r.offer_id AND r.campaign_id = ?
    `;
    const args = [campaignId];
    
    if (startDate) {
      sql += ' AND r.created_at >= ?';
      args.push(startDate);
    }
    if (endDate) {
      sql += ' AND r.created_at <= ?';
      args.push(endDate);
    }
    
    sql += ' WHERE o.campaign_id = ? GROUP BY o.id, o.name ORDER BY clicks DESC';
    args.push(campaignId);
    
    const result = await db.execute({ sql, args });
    return result.rows;
  }
  
  static async getTimeSeries(campaignId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const result = await db.execute({
      sql: `
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as clicks
        FROM redirects
        WHERE campaign_id = ? AND created_at >= ?
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `,
      args: [campaignId, startDate.toISOString()]
    });
    
    return result.rows;
  }
}

module.exports = Redirect;
