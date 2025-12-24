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
    
    // Extract UTM parameters
    const utmParams = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(key => {
      if (req.query[key]) {
        utmParams[key] = req.query[key];
      }
    });
    
    // Get all time rules for this campaign
    const timeRules = await TimeRule.findByCampaignId(campaign.id);
    
    // Get current time
    const now = new Date();
    
    // Try to find a matching offer based on time rules
    let matchingOffer = null;
    
    for (const rule of timeRules) {
      // Get timezone (rule-specific or campaign default)
      const timezone = rule.timezone || campaign.timezone || 'UTC';
      
      // Check day of week
      if (!dayMatches(now, rule.day_of_week, timezone)) {
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
          matchingOffer = offer;
          break;
        }
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
    
    // Append UTM parameters
    const finalUrl = appendUtmParams(redirectUrl, utmParams);
    
    // Record redirect (async, don't wait)
    Redirect.create({
      campaign_id: campaign.id,
      offer_id: offerId,
      redirected_to_url: finalUrl,
      utm_source: utmParams.utm_source,
      utm_medium: utmParams.utm_medium,
      utm_campaign: utmParams.utm_campaign,
      utm_term: utmParams.utm_term,
      utm_content: utmParams.utm_content,
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
