const Campaign = require('../models/Campaign');
const TimeRule = require('../models/TimeRule');
const Redirect = require('../models/Redirect');
const Domain = require('../models/Domain');
const fs = require('fs');
const path = require('path');
const { timeInRange, timeMatches: checkTimeMatches, dayMatches } = require('../utils/time');

async function handleRedirect(req, res, next) {
  try {
    const { slug } = req.params;
    
    // Find campaign by slug
    const campaign = await Campaign.findBySlug(slug);
    if (!campaign) {
      return res.status(404).send('Campaign not found');
    }
    
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
      
      if (matches && rule.offer_position) {
        matchingRules.push({
          rule,
          offer_position: rule.offer_position,
          weight: rule.weight || 100
        });
      }
    }
    
    // Select offer position based on weighted probability if multiple matches
    let selectedPosition = 1; // Default to position 1
    if (matchingRules.length === 1) {
      selectedPosition = matchingRules[0].offer_position;
    } else if (matchingRules.length > 1) {
      // Weighted random selection
      const totalWeight = matchingRules.reduce((sum, mr) => sum + (mr.weight || 100), 0);
      const random = Math.random() * totalWeight;
      let cumulativeWeight = 0;
      
      for (const mr of matchingRules) {
        cumulativeWeight += (mr.weight || 100);
        if (random <= cumulativeWeight) {
          selectedPosition = mr.offer_position;
          break;
        }
      }
      
      // Fallback to first if somehow none selected (shouldn't happen)
      if (!selectedPosition) {
        selectedPosition = matchingRules[0].offer_position;
      }
    }
    
    // Ensure position is within valid range
    const numberOfOffers = campaign.number_of_offers || 1;
    if (selectedPosition < 1 || selectedPosition > numberOfOffers) {
      selectedPosition = 1;
    }
    
    // Get custom domain for this campaign
    let baseDomain = null;
    if (campaign.domain_id) {
      const domain = await Domain.findById(campaign.domain_id);
      if (domain && domain.is_active) {
        baseDomain = domain.domain;
      }
    }
    
    // If no custom domain set, try to get an active domain
    if (!baseDomain) {
      const allDomains = await Domain.findAll();
      const activeDomain = allDomains.find(d => d.is_active);
      if (activeDomain) {
        baseDomain = activeDomain.domain;
      }
    }
    
    // Extract base domain (remove any existing subdomain like "clk.")
    // If domain is "clk.safeuinsurance.com", extract "safeuinsurance.com"
    // If domain is "safeuinsurance.com", keep it as is
    let baseDomainOnly = baseDomain;
    if (baseDomain && baseDomain.startsWith('clk.')) {
      baseDomainOnly = baseDomain.substring(4); // Remove "clk." prefix
    }
    
    // Always use "clk." prefix for redirect domain
    const redirectDomain = baseDomainOnly ? `clk.${baseDomainOnly}` : (req.get('host') || 'clk.safeuinsurance.com');
    
    // If default domain doesn't start with "clk.", add it
    const customDomain = redirectDomain.startsWith('clk.') ? redirectDomain : `clk.${redirectDomain}`;
    
    // Get RedTrack campaign ID
    const redtrackCampaignId = campaign.redtrack_campaign_id || '';
    
    // Load redirect template
    const templatePath = path.join(__dirname, '../redirect/index.html');
    let template = fs.readFileSync(templatePath, 'utf8');
    
    // Replace template variables
    // Replace rtkcmpid in the script tag
    if (redtrackCampaignId) {
      template = template.replace(/rtkcmpid=[^"']*/, `rtkcmpid=${redtrackCampaignId}`);
    } else {
      // Remove the script tag if no RedTrack campaign ID
      template = template.replace(/<script[^>]*track\.js[^>]*><\/script>/i, '');
    }
    
    // Replace domain in URLs (both script src and click URLs)
    template = template.replace(/https?:\/\/[^\/]+/g, `https://${customDomain}`);
    template = template.replace(/clk\.safeuinsurance\.com/g, customDomain);
    
    // Replace offer position in click URLs
    template = template.replace(/\/click\/\d+/g, `/click/${selectedPosition}`);
    
    // Record redirect (async, don't wait)
    Redirect.create({
      campaign_id: campaign.id,
      offer_id: null, // No longer using offer_id
      redirected_to_url: `https://${customDomain}/click/${selectedPosition}`,
      utm_source: req.query.utm_source || null,
      utm_medium: req.query.utm_medium || null,
      utm_campaign: req.query.utm_campaign || null,
      utm_term: req.query.utm_term || null,
      utm_content: req.query.utm_content || null,
      ip_address: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      user_agent: req.headers['user-agent'],
      referrer: req.headers.referer
    }).catch(err => {
      console.error('Error recording redirect:', err);
      // Don't fail the redirect if statistics recording fails
    });
    
    // Send the HTML template
    res.setHeader('Content-Type', 'text/html');
    res.send(template);
  } catch (error) {
    console.error('Redirect error:', error);
    next(error);
  }
}

module.exports = {
  handleRedirect
};
