const User = require('../models/User');

function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  
  res.status(401).json({ error: 'Authentication required' });
}

async function requireVerified(req, res, next) {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Check if user is verified
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (!user.is_verified) {
      return res.status(403).json({ 
        error: 'Your account is pending admin approval. Please wait for verification.' 
      });
    }
    
    // Update session with latest user data
    req.session.is_admin = user.is_admin;
    req.session.is_verified = user.is_verified;
    
    next();
  } catch (error) {
    next(error);
  }
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.is_admin) {
    return next();
  }
  
  res.status(403).json({ error: 'Admin access required' });
}

module.exports = { requireAuth, requireVerified, requireAdmin };
