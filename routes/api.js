const express = require('express');
const router = express.Router();
const { requireAuth, requireVerified } = require('../middleware/authMiddleware');
const campaignController = require('../controllers/campaignController');
const statsController = require('../controllers/statsController');
const adminController = require('../controllers/adminController');
const offerController = require('../controllers/offerController');

// All routes require authentication and verification
router.use(requireAuth);
router.use(requireVerified);

// Campaign routes
router.get('/campaigns', campaignController.listCampaigns);
router.post('/campaigns', campaignController.createCampaign);
router.get('/campaigns/:id', campaignController.getCampaign);
router.put('/campaigns/:id', campaignController.updateCampaign);
router.delete('/campaigns/:id', campaignController.deleteCampaign);

// Campaign statistics
router.get('/campaigns/:id/stats', statsController.getCampaignStats);

// Offer management routes (user's offer library)
router.get('/offers', offerController.listOffers);
router.get('/offers/:id', offerController.getOffer);
router.post('/offers', offerController.createOffer);
router.put('/offers/:id', offerController.updateOffer);
router.delete('/offers/:id', offerController.deleteOffer);

// Time rule routes (for campaigns)
router.post('/campaigns/:campaign_id/time-rules', campaignController.createTimeRule);
router.put('/time-rules/:id', campaignController.updateTimeRule);
router.delete('/time-rules/:id', campaignController.deleteTimeRule);

// Offer statistics
router.get('/offers/:id/stats', statsController.getOfferStats);

// Admin routes
router.get('/admin/pending-users', adminController.listPendingUsers);
router.post('/admin/users/:id/approve', adminController.approveUser);
router.post('/admin/users/:id/reject', adminController.rejectUser);

module.exports = router;
