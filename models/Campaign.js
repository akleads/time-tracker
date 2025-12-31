const db = require('../config/database');
const { randomUUID } = require('crypto');

class Campaign {
  static async create(userId, name, slug, timezone = 'UTC', domainId = null, redtrackCampaignId = null, numberOfOffers = 1) {
    const id = randomUUID();
    const now = new Date().toISOString();
    
    // We still need fallback_offer_url for backward compatibility during migration
    // But it will default to empty string and won't be used
    await db.execute({
      sql: `INSERT INTO campaigns (id, user_id, name, slug, fallback_offer_url, domain_id, timezone, redtrack_campaign_id, number_of_offers, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, userId, name, slug, '', domainId, timezone, redtrackCampaignId, numberOfOffers, now, now]
    });
    
    return this.findById(id);
  }
  
  static async findById(id) {
    try {
      const result = await db.execute({
        sql: `SELECT id, user_id, name, slug, fallback_offer_url, fallback_offer_id, domain_id, timezone, 
                     redtrack_campaign_id, number_of_offers, created_at, updated_at
              FROM campaigns WHERE id = ?`,
        args: [id]
      });
      
      const campaign = result.rows[0] || null;
      if (!campaign) return null;
      
      // Load offer positions for this campaign
      const positions = await this.getOfferPositions(id);
      campaign.offer_positions = positions;
      
      return campaign;
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
          domain_id: null,
          redtrack_campaign_id: null,
          number_of_offers: 1,
          offer_positions: []
        };
      }
      throw error;
    }
  }
  
  static async findBySlug(slug) {
    try {
      const result = await db.execute({
        sql: `SELECT id, user_id, name, slug, fallback_offer_url, fallback_offer_id, domain_id, timezone, 
                     redtrack_campaign_id, number_of_offers, created_at, updated_at
              FROM campaigns WHERE slug = ?`,
        args: [slug]
      });
      
      const campaign = result.rows[0] || null;
      if (!campaign) return null;
      
      // Load offer positions for this campaign
      const positions = await this.getOfferPositions(campaign.id);
      campaign.offer_positions = positions;
      
      return campaign;
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
          domain_id: null,
          redtrack_campaign_id: null,
          number_of_offers: 1,
          offer_positions: []
        };
      }
      throw error;
    }
  }
  
  static async findByUserId(userId) {
    try {
      // Try to select with new columns first
      const result = await db.execute({
        sql: `SELECT id, user_id, name, slug, fallback_offer_url, fallback_offer_id, domain_id, timezone, 
                     redtrack_campaign_id, number_of_offers, created_at, updated_at
              FROM campaigns WHERE user_id = ? ORDER BY created_at DESC`,
        args: [userId]
      });
      
      // Load offer positions for each campaign
      const campaigns = await Promise.all(
        result.rows.map(async (campaign) => {
          const positions = await this.getOfferPositions(campaign.id);
          return { ...campaign, offer_positions: positions };
        })
      );
      
      return campaigns;
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
          domain_id: null,
          redtrack_campaign_id: null,
          number_of_offers: 1,
          offer_positions: []
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
    // Handle domain_id - can be null to clear it
    if (updates.domain_id !== undefined) {
      fields.push('domain_id = ?');
      values.push(updates.domain_id);
    }
    if (updates.timezone) {
      fields.push('timezone = ?');
      values.push(updates.timezone);
    }
    // Handle new fields
    if (updates.redtrack_campaign_id !== undefined) {
      fields.push('redtrack_campaign_id = ?');
      values.push(updates.redtrack_campaign_id);
    }
    if (updates.number_of_offers !== undefined) {
      fields.push('number_of_offers = ?');
      values.push(updates.number_of_offers);
    }
    
    // Must have at least one field to update (besides updated_at)
    if (fields.length === 0) {
      throw new Error('No fields to update');
    }
    
    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);
    
    const sql = `UPDATE campaigns SET ${fields.join(', ')} WHERE id = ?`;
    
    try {
      await db.execute({
        sql,
        args: values
      });
      
      return this.findById(id);
    } catch (error) {
      console.error('Database error in Campaign.update:', error);
      console.error('SQL:', sql);
      console.error('Values:', values);
      throw error;
    }
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
  
  // Offer position management methods
  static async getOfferPositions(campaignId) {
    try {
      const result = await db.execute({
        sql: `SELECT id, campaign_id, position, title, created_at, updated_at
              FROM campaign_offer_positions 
              WHERE campaign_id = ? 
              ORDER BY position ASC`,
        args: [campaignId]
      });
      
      return result.rows;
    } catch (error) {
      // If table doesn't exist yet, return empty array
      if (error.message && error.message.includes('no such table')) {
        return [];
      }
      throw error;
    }
  }
  
  static async setOfferPosition(campaignId, position, title) {
    const id = randomUUID();
    const now = new Date().toISOString();
    
    try {
      // Try to update first
      const existing = await db.execute({
        sql: `SELECT id FROM campaign_offer_positions 
              WHERE campaign_id = ? AND position = ?`,
        args: [campaignId, position]
      });
      
      if (existing.rows.length > 0) {
        // Update existing
        await db.execute({
          sql: `UPDATE campaign_offer_positions 
                SET title = ?, updated_at = ? 
                WHERE campaign_id = ? AND position = ?`,
          args: [title, now, campaignId, position]
        });
        return { id: existing.rows[0].id, campaign_id: campaignId, position, title };
      } else {
        // Insert new
        await db.execute({
          sql: `INSERT INTO campaign_offer_positions (id, campaign_id, position, title, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)`,
          args: [id, campaignId, position, title, now, now]
        });
        return { id, campaign_id: campaignId, position, title };
      }
    } catch (error) {
      // If table doesn't exist yet, create it
      if (error.message && error.message.includes('no such table')) {
        throw new Error('campaign_offer_positions table does not exist. Please run the migration first.');
      }
      throw error;
    }
  }
  
  static async deleteOfferPosition(campaignId, position) {
    await db.execute({
      sql: `DELETE FROM campaign_offer_positions 
            WHERE campaign_id = ? AND position = ?`,
      args: [campaignId, position]
    });
  }
  
  static async setOfferPositions(campaignId, positions) {
    // positions is an array of { position: number, title: string }
    // Delete all existing positions for this campaign
    await db.execute({
      sql: `DELETE FROM campaign_offer_positions WHERE campaign_id = ?`,
      args: [campaignId]
    });
    
    // Insert new positions
    const now = new Date().toISOString();
    for (const pos of positions) {
      const id = randomUUID();
      await db.execute({
        sql: `INSERT INTO campaign_offer_positions (id, campaign_id, position, title, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [id, campaignId, pos.position, pos.title || null, now, now]
      });
    }
  }
}

module.exports = Campaign;

