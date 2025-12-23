const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const campaignController = require('../controllers/campaignController');
const statsController = require('../controllers/statsController');

// All routes require authentication
router.use(requireAuth);

// Campaign routes
router.get('/campaigns', campaignController.listCampaigns);
router.post('/campaigns', campaignController.createCampaign);
router.get('/campaigns/:id', campaignController.getCampaign);
router.put('/campaigns/:id', campaignController.updateCampaign);
router.delete('/campaigns/:id', campaignController.deleteCampaign);

// Campaign statistics
router.get('/campaigns/:id/stats', statsController.getCampaignStats);

// Offer routes
router.post('/campaigns/:campaign_id/offers', campaignController.createOffer);
router.put('/offers/:id', campaignController.updateOffer);
router.delete('/offers/:id', campaignController.deleteOffer);

// Time rule routes
router.post('/offers/:offer_id/time-rules', campaignController.createTimeRule);
router.put('/time-rules/:id', campaignController.updateTimeRule);
router.delete('/time-rules/:id', campaignController.deleteTimeRule);

// Offer statistics
router.get('/offers/:id/stats', statsController.getOfferStats);

module.exports = router;
