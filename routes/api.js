const express = require('express');
const router = express.Router();
const { requireAuth, requireVerified, requireAdmin } = require('../middleware/authMiddleware');
const campaignController = require('../controllers/campaignController');
const statsController = require('../controllers/statsController');
const adminController = require('../controllers/adminController');
const offerController = require('../controllers/offerController');
const domainController = require('../controllers/domainController');

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

// Admin routes (require admin access - note: requireAuth and requireVerified are already applied via router.use above)
router.get('/admin/pending-users', requireAdmin, adminController.listPendingUsers);
router.get('/admin/users', requireAdmin, adminController.listAllUsers);
router.post('/admin/users/:id/approve', requireAdmin, adminController.approveUser);
router.post('/admin/users/:id/reject', requireAdmin, adminController.rejectUser);
router.post('/admin/users/:id/revoke', requireAdmin, adminController.revokeUser);
router.post('/admin/users/:id/reset-password', requireAdmin, adminController.resetUserPassword);
router.post('/admin/run-migration', requireAdmin, adminController.runMigration);

// Domain management routes (admin only)
router.get('/domains', requireAdmin, domainController.listDomains);
router.post('/domains', requireAdmin, domainController.createDomain);
router.put('/domains/:id', requireAdmin, domainController.updateDomain);
router.delete('/domains/:id', requireAdmin, domainController.deleteDomain);

module.exports = router;
