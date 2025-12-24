const Offer = require('../models/Offer');

async function listOffers(req, res, next) {
  try {
    const offers = await Offer.findByUserId(req.session.userId);
    res.json(offers);
  } catch (error) {
    next(error);
  }
}

async function getOffer(req, res, next) {
  try {
    const { id } = req.params;
    const offer = await Offer.findById(id);
    
    if (!offer) {
      return res.status(404).json({ error: 'Offer not found' });
    }
    
    // Verify ownership
    if (offer.user_id !== req.session.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json(offer);
  } catch (error) {
    next(error);
  }
}

async function createOffer(req, res, next) {
  try {
    const { name, url, priority } = req.body;
    
    if (!name || !url) {
      return res.status(400).json({ error: 'Name and url are required' });
    }
    
    const offer = await Offer.create(req.session.userId, name, url, priority || 0, null);
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

module.exports = {
  listOffers,
  getOffer,
  createOffer,
  updateOffer,
  deleteOffer
};
