const Domain = require('../models/Domain');

async function listDomains(req, res, next) {
  try {
    const domains = await Domain.findAll();
    res.json(domains);
  } catch (error) {
    next(error);
  }
}

async function createDomain(req, res, next) {
  try {
    const { domain } = req.body;
    
    if (!domain) {
      return res.status(400).json({ error: 'Domain is required' });
    }
    
    // Basic domain validation
    const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
    if (!domainRegex.test(domain)) {
      return res.status(400).json({ error: 'Invalid domain format' });
    }
    
    const newDomain = await Domain.create(domain);
    res.status(201).json(newDomain);
  } catch (error) {
    if (error.message && error.message.includes('UNIQUE constraint')) {
      return res.status(409).json({ error: 'Domain already exists' });
    }
    next(error);
  }
}

async function updateDomain(req, res, next) {
  try {
    const { id } = req.params;
    const { domain, is_active } = req.body;
    
    const updates = {};
    if (domain) {
      const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
      if (!domainRegex.test(domain)) {
        return res.status(400).json({ error: 'Invalid domain format' });
      }
      updates.domain = domain;
    }
    if (is_active !== undefined) {
      updates.is_active = is_active;
    }
    
    const updated = await Domain.update(id, updates);
    res.json(updated);
  } catch (error) {
    if (error.message && error.message.includes('UNIQUE constraint')) {
      return res.status(409).json({ error: 'Domain already exists' });
    }
    next(error);
  }
}

async function deleteDomain(req, res, next) {
  try {
    const { id } = req.params;
    await Domain.delete(id);
    res.json({ message: 'Domain deleted successfully' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listDomains,
  createDomain,
  updateDomain,
  deleteDomain
};

