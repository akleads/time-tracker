const Campaign = require('../models/Campaign');
const Offer = require('../models/Offer');
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
    
    // Get offers with time rules
    const offers = await Offer.findByCampaignId(id);
    const offersWithRules = await Promise.all(
      offers.map(async (offer) => {
        const rules = await TimeRule.findByOfferId(offer.id);
        return { ...offer, time_rules: rules };
      })
    );
    
    res.json({
      ...campaign,
      offers: offersWithRules
    });
  } catch (error) {
    next(error);
  }
}

async function createCampaign(req, res, next) {
  try {
    const { name, slug, fallback_offer_url, timezone } = req.body;
    
    if (!name || !fallback_offer_url) {
      return res.status(400).json({ error: 'Name and fallback_offer_url are required' });
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
      fallback_offer_url,
      timezone || 'UTC'
    );
    
    res.status(201).json(campaign);
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
    
    const { name, slug, fallback_offer_url, timezone } = req.body;
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
    if (fallback_offer_url) updates.fallback_offer_url = fallback_offer_url;
    if (timezone) updates.timezone = timezone;
    
    const updated = await Campaign.update(id, updates);
    res.json(updated);
  } catch (error) {
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

async function createOffer(req, res, next) {
  try {
    const { campaign_id } = req.params;
    const { name, url, priority } = req.body;
    
    if (!name || !url) {
      return res.status(400).json({ error: 'Name and url are required' });
    }
    
    // Verify campaign ownership
    const campaign = await Campaign.findById(campaign_id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    if (campaign.user_id !== req.session.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const offer = await Offer.create(campaign_id, name, url, priority || 0);
    res.status(201).json(offer);
  } catch (error) {
    next(error);
  }
}

async function updateOffer(req, res, next) {
  try {
    const { id } = req.params;
    
    // Verify ownership
    const belongsToUser = await Offer.belongsToUser(id, req.session.userId);
    if (!belongsToUser) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const { name, url, priority } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (url) updates.url = url;
    if (priority !== undefined) updates.priority = priority;
    
    const updated = await Offer.update(id, updates);
    res.json(updated);
  } catch (error) {
    next(error);
  }
}

async function deleteOffer(req, res, next) {
  try {
    const { id } = req.params;
    
    // Verify ownership
    const belongsToUser = await Offer.belongsToUser(id, req.session.userId);
    if (!belongsToUser) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    await Offer.delete(id);
    res.json({ message: 'Offer deleted successfully' });
  } catch (error) {
    next(error);
  }
}

async function createTimeRule(req, res, next) {
  try {
    const { offer_id } = req.params;
    const { rule_type, start_time, end_time, day_of_week, timezone } = req.body;
    
    if (!rule_type || !start_time) {
      return res.status(400).json({ error: 'rule_type and start_time are required' });
    }
    
    if (rule_type === 'range' && !end_time) {
      return res.status(400).json({ error: 'end_time is required for range type' });
    }
    
    // Verify offer ownership
    const belongsToUser = await Offer.belongsToUser(offer_id, req.session.userId);
    if (!belongsToUser) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const rule = await TimeRule.create(
      offer_id,
      rule_type,
      start_time,
      end_time || null,
      day_of_week !== undefined ? day_of_week : null,
      timezone || null
    );
    
    res.status(201).json(rule);
  } catch (error) {
    next(error);
  }
}

async function updateTimeRule(req, res, next) {
  try {
    const { id } = req.params;
    
    // Get rule and verify ownership via offer
    const rule = await TimeRule.findById(id);
    if (!rule) {
      return res.status(404).json({ error: 'Time rule not found' });
    }
    
    const belongsToUser = await Offer.belongsToUser(rule.offer_id, req.session.userId);
    if (!belongsToUser) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const { rule_type, start_time, end_time, day_of_week, timezone } = req.body;
    const updates = {};
    if (rule_type) updates.rule_type = rule_type;
    if (start_time) updates.start_time = start_time;
    if (end_time !== undefined) updates.end_time = end_time;
    if (day_of_week !== undefined) updates.day_of_week = day_of_week;
    if (timezone !== undefined) updates.timezone = timezone;
    
    const updated = await TimeRule.update(id, updates);
    res.json(updated);
  } catch (error) {
    next(error);
  }
}

async function deleteTimeRule(req, res, next) {
  try {
    const { id } = req.params;
    
    // Get rule and verify ownership via offer
    const rule = await TimeRule.findById(id);
    if (!rule) {
      return res.status(404).json({ error: 'Time rule not found' });
    }
    
    const belongsToUser = await Offer.belongsToUser(rule.offer_id, req.session.userId);
    if (!belongsToUser) {
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
  createOffer,
  updateOffer,
  deleteOffer,
  createTimeRule,
  updateTimeRule,
  deleteTimeRule
};
