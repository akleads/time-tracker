const Campaign = require('../models/Campaign');
const TimeRule = require('../models/TimeRule');
const { generateSlug, validateSlug } = require('../utils/slug');

async function listCampaigns(req, res, next) {
  try {
    const campaigns = await Campaign.findByUserId(req.session.userId);
    res.json(campaigns);
  } catch (error) {
    next(error);
  }
}

async function getCampaign(req, res, next) {
  try {
    const { id } = req.params;
    const campaign = await Campaign.findById(id);
    
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    // Verify ownership
    if (campaign.user_id !== req.session.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get time rules for this campaign
    const timeRules = await TimeRule.findByCampaignId(id);
    
    res.json({
      ...campaign,
      time_rules: timeRules
    });
  } catch (error) {
    next(error);
  }
}

async function createCampaign(req, res, next) {
  try {
    const { name, slug, domain_id, timezone, redtrack_campaign_id, number_of_offers, offer_positions } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    if (!number_of_offers || number_of_offers < 1) {
      return res.status(400).json({ error: 'number_of_offers must be at least 1' });
    }
    
    // Generate or validate slug
    let finalSlug = slug || generateSlug(8);
    
    // Validate slug format
    if (!validateSlug(finalSlug)) {
      return res.status(400).json({ error: 'Slug must be 3-50 alphanumeric characters' });
    }
    
    // Check if slug exists
    const slugExists = await Campaign.slugExists(finalSlug);
    if (slugExists) {
      // Generate a new unique slug
      let attempts = 0;
      while (slugExists && attempts < 10) {
        finalSlug = generateSlug(8);
        attempts++;
      }
      if (await Campaign.slugExists(finalSlug)) {
        return res.status(409).json({ error: 'Unable to generate unique slug' });
      }
    }
    
    const campaign = await Campaign.create(
      req.session.userId,
      name,
      finalSlug,
      timezone || 'UTC',
      domain_id || null,
      redtrack_campaign_id || null,
      number_of_offers || 1
    );
    
    // Set offer positions if provided
    if (offer_positions && Array.isArray(offer_positions)) {
      await Campaign.setOfferPositions(campaign.id, offer_positions);
    }
    
    // Reload campaign to get positions
    const updatedCampaign = await Campaign.findById(campaign.id);
    
    res.status(201).json(updatedCampaign);
  } catch (error) {
    next(error);
  }
}

async function updateCampaign(req, res, next) {
  try {
    const { id } = req.params;
    
    const campaign = await Campaign.findById(id);
    
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    // Verify ownership
    if (campaign.user_id !== req.session.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const { name, slug, domain_id, timezone, redtrack_campaign_id, number_of_offers, offer_positions } = req.body;
    const updates = {};
    
    if (name) updates.name = name;
    if (slug) {
      if (!validateSlug(slug)) {
        return res.status(400).json({ error: 'Slug must be 3-50 alphanumeric characters' });
      }
      const slugExists = await Campaign.slugExists(slug, id);
      if (slugExists) {
        return res.status(409).json({ error: 'Slug already exists' });
      }
      updates.slug = slug;
    }
    
    if (domain_id !== undefined) {
      updates.domain_id = domain_id || null;
    }
    if (timezone) updates.timezone = timezone;
    if (redtrack_campaign_id !== undefined) {
      updates.redtrack_campaign_id = redtrack_campaign_id || null;
    }
    if (number_of_offers !== undefined) {
      if (number_of_offers < 1) {
        return res.status(400).json({ error: 'number_of_offers must be at least 1' });
      }
      updates.number_of_offers = number_of_offers;
    }
    
    // Update offer positions if provided
    if (offer_positions && Array.isArray(offer_positions)) {
      await Campaign.setOfferPositions(id, offer_positions);
    }
    
    // Ensure at least one field is being updated
    if (Object.keys(updates).length === 0 && !offer_positions) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    const updated = await Campaign.update(id, updates);
    // Reload to get updated positions
    const finalCampaign = await Campaign.findById(id);
    res.json(finalCampaign);
  } catch (error) {
    console.error('Error updating campaign:', error);
    next(error);
  }
}

async function deleteCampaign(req, res, next) {
  try {
    const { id } = req.params;
    const campaign = await Campaign.findById(id);
    
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    // Verify ownership
    if (campaign.user_id !== req.session.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    await Campaign.delete(id);
    res.json({ message: 'Campaign deleted successfully' });
  } catch (error) {
    next(error);
  }
}


async function createTimeRule(req, res, next) {
  try {
    const { campaign_id } = req.params;
    const { offer_position, rule_type, start_time, end_time, day_of_week, timezone, weight } = req.body;
    
    if (offer_position === undefined || !rule_type || !start_time) {
      return res.status(400).json({ error: 'offer_position, rule_type and start_time are required' });
    }
    
    if (rule_type === 'range' && !end_time) {
      return res.status(400).json({ error: 'end_time is required for range type' });
    }
    
    // Verify campaign ownership
    const campaign = await Campaign.findById(campaign_id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    if (campaign.user_id !== req.session.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Validate offer_position is within campaign's number_of_offers
    const position = parseInt(offer_position);
    if (position < 1 || position > (campaign.number_of_offers || 1)) {
      return res.status(400).json({ error: `offer_position must be between 1 and ${campaign.number_of_offers || 1}` });
    }
    
    // Validate weight (0-100, default 100)
    const ruleWeight = weight !== undefined ? Math.max(0, Math.min(100, parseInt(weight) || 100)) : 100;
    
    const rule = await TimeRule.create(
      campaign_id,
      position,
      rule_type,
      start_time,
      end_time || null,
      day_of_week !== undefined ? day_of_week : null,
      timezone || null,
      ruleWeight
    );
    
    res.status(201).json(rule);
  } catch (error) {
    console.error('Error creating time rule:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      campaign_id: req.params.campaign_id,
      offer_position: req.body.offer_position,
      rule_type: req.body.rule_type,
      start_time: req.body.start_time,
      end_time: req.body.end_time
    });
    next(error);
  }
}

async function updateTimeRule(req, res, next) {
  try {
    const { id } = req.params;
    
    // Get rule and verify ownership via campaign
    const rule = await TimeRule.findById(id);
    if (!rule) {
      return res.status(404).json({ error: 'Time rule not found' });
    }
    
    const campaign = await Campaign.findById(rule.campaign_id);
    if (!campaign || campaign.user_id !== req.session.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const { offer_position, rule_type, start_time, end_time, day_of_week, timezone, weight } = req.body;
    const updates = {};
    
    if (offer_position !== undefined) {
      const position = parseInt(offer_position);
      if (position < 1 || position > (campaign.number_of_offers || 1)) {
        return res.status(400).json({ error: `offer_position must be between 1 and ${campaign.number_of_offers || 1}` });
      }
      updates.offer_position = position;
    }
    if (rule_type) updates.rule_type = rule_type;
    if (start_time) updates.start_time = start_time;
    if (end_time !== undefined) updates.end_time = end_time;
    if (day_of_week !== undefined) updates.day_of_week = day_of_week;
    if (timezone !== undefined) updates.timezone = timezone;
    if (weight !== undefined) {
      // Validate weight (0-100)
      updates.weight = Math.max(0, Math.min(100, parseInt(weight) || 100));
    }
    
    const updated = await TimeRule.update(id, updates);
    res.json(updated);
  } catch (error) {
    next(error);
  }
}

async function deleteTimeRule(req, res, next) {
  try {
    const { id } = req.params;
    
    // Get rule and verify ownership via campaign
    const rule = await TimeRule.findById(id);
    if (!rule) {
      return res.status(404).json({ error: 'Time rule not found' });
    }
    
    const campaign = await Campaign.findById(rule.campaign_id);
    if (!campaign || campaign.user_id !== req.session.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    await TimeRule.delete(id);
    res.json({ message: 'Time rule deleted successfully' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  createTimeRule,
  updateTimeRule,
  deleteTimeRule
};
