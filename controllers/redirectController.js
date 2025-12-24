const Campaign = require('../models/Campaign');
const Offer = require('../models/Offer');
const TimeRule = require('../models/TimeRule');
const Redirect = require('../models/Redirect');
const { timeInRange, timeMatches: checkTimeMatches, dayMatches, appendUtmParams } = require('../utils/time');

async function handleRedirect(req, res, next) {
  try {
    const { slug } = req.params;
    
    // Find campaign by slug
    const campaign = await Campaign.findBySlug(slug);
    if (!campaign) {
      return res.status(404).send('Campaign not found');
    }
    
    // Extract ALL query parameters and pass them through to the offer URL
    // This includes any tracking parameters like sub1, sub2, sub3, etc.
    const allParams = {};
    Object.keys(req.query).forEach(key => {
      if (req.query[key]) {
        allParams[key] = req.query[key];
      }
    });
    
    // Get all time rules for this campaign
    const timeRules = await TimeRule.findByCampaignId(campaign.id);
    
    // Get current time
    const now = new Date();
    const campaignTimezone = campaign.timezone || 'UTC';
    
    // Collect all matching rules (instead of breaking on first match)
    const matchingRules = [];
    
    for (const rule of timeRules) {
      // Use campaign timezone (no per-rule timezone for schedule view)
      const timezone = campaignTimezone;
      
      // Check day of week (null = all days)
      if (rule.day_of_week !== null && !dayMatches(now, rule.day_of_week, timezone)) {
        continue;
      }
      
      // Check time based on rule type
      let matches = false;
      if (rule.rule_type === 'range') {
        if (!rule.end_time) continue;
        matches = timeInRange(now, rule.start_time, rule.end_time, timezone);
      } else if (rule.rule_type === 'specific') {
        matches = checkTimeMatches(now, rule.start_time, timezone, 1);
      }
      
      if (matches) {
        // Get the offer for this rule
        const offer = await Offer.findById(rule.offer_id);
        if (offer) {
          matchingRules.push({
            rule,
            offer,
            weight: rule.weight || 100
          });
        }
      }
    }
    
    // Select offer based on weighted probability if multiple matches
    let matchingOffer = null;
    if (matchingRules.length === 1) {
      matchingOffer = matchingRules[0].offer;
    } else if (matchingRules.length > 1) {
      // Weighted random selection
      const totalWeight = matchingRules.reduce((sum, mr) => sum + (mr.weight || 100), 0);
      const random = Math.random() * totalWeight;
      let cumulativeWeight = 0;
      
      for (const mr of matchingRules) {
        cumulativeWeight += (mr.weight || 100);
        if (random <= cumulativeWeight) {
          matchingOffer = mr.offer;
          break;
        }
      }
      
      // Fallback to first if somehow none selected (shouldn't happen)
      if (!matchingOffer) {
        matchingOffer = matchingRules[0].offer;
      }
    }
    
    // Determine redirect URL
    let redirectUrl;
    let offerId = null;
    
    if (matchingOffer) {
      redirectUrl = matchingOffer.url;
      offerId = matchingOffer.id;
    } else {
      // Use fallback offer if available, otherwise use fallback URL
      if (campaign.fallback_offer_id) {
        const fallbackOffer = await Offer.findById(campaign.fallback_offer_id);
        if (fallbackOffer) {
          redirectUrl = fallbackOffer.url;
          offerId = fallbackOffer.id;
        } else {
          redirectUrl = campaign.fallback_offer_url;
        }
      } else {
        redirectUrl = campaign.fallback_offer_url;
      }
    }
    
    // Append ALL query parameters to the offer URL
    const finalUrl = appendUtmParams(redirectUrl, allParams);
    
    // Record redirect (async, don't wait)
    // Store standard UTM params if they exist, otherwise null
    Redirect.create({
      campaign_id: campaign.id,
      offer_id: offerId,
      redirected_to_url: finalUrl,
      utm_source: allParams.utm_source || null,
      utm_medium: allParams.utm_medium || null,
      utm_campaign: allParams.utm_campaign || null,
      utm_term: allParams.utm_term || null,
      utm_content: allParams.utm_content || null,
      ip_address: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      user_agent: req.headers['user-agent'],
      referrer: req.headers.referer
    }).catch(err => {
      console.error('Error recording redirect:', err);
      // Don't fail the redirect if statistics recording fails
    });
    
    // Perform redirect
    res.redirect(302, finalUrl);
  } catch (error) {
    console.error('Redirect error:', error);
    next(error);
  }
}

module.exports = {
  handleRedirect
};
