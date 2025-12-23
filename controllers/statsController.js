const Campaign = require('../models/Campaign');
const Redirect = require('../models/Redirect');

async function getCampaignStats(req, res, next) {
  try {
    const { id } = req.params;
    
    // Verify campaign ownership
    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    if (campaign.user_id !== req.session.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get overall stats
    const overallStats = await Redirect.getCampaignStats(id);
    
    // Get offer stats
    const offerStats = await Redirect.getOfferStats(id);
    
    // Get time series (last 30 days)
    const timeSeries = await Redirect.getTimeSeries(id, 30);
    
    res.json({
      campaign_id: id,
      overall: overallStats,
      by_offer: offerStats,
      time_series: timeSeries
    });
  } catch (error) {
    next(error);
  }
}

async function getOfferStats(req, res, next) {
  try {
    const { id } = req.params;
    
    // This would require Offer model to verify ownership
    // For now, we'll use campaign stats filtered by offer
    // A more complete implementation would add this to the Offer model
    
    res.status(501).json({ error: 'Offer-specific stats not yet implemented' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getCampaignStats,
  getOfferStats
};
