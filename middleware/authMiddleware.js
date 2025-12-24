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

async function requireAdmin(req, res, next) {
  try {
    // Debug logging
    console.log('requireAdmin - Starting check, Session:', {
      hasSession: !!req.session,
      userId: req.session?.userId,
      isAdmin: req.session?.is_admin,
      sessionId: req.sessionID
    });
    
    if (!req.session || !req.session.userId) {
      console.error('requireAdmin - No session or userId');
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Verify user is admin from database
    console.log('requireAdmin - Looking up user:', req.session.userId);
    const user = await User.findById(req.session.userId);
    console.log('requireAdmin - User found:', user ? { id: user.id, username: user.username, is_admin: user.is_admin } : 'null');
    
    if (!user) {
      console.error('requireAdmin - User not found:', req.session.userId);
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if user is admin (handle both boolean and integer values)
    const isAdmin = user.is_admin === true || user.is_admin === 1 || user.is_admin === '1';
    console.log('requireAdmin - User admin check:', {
      username: user.username,
      is_admin: user.is_admin,
      isAdminResult: isAdmin
    });
    
    if (!isAdmin) {
      console.log('requireAdmin - User is not admin, denying access');
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    // Update session with latest admin status
    req.session.is_admin = true;
    console.log('requireAdmin - User is admin, allowing access');
    
    next();
  } catch (error) {
    console.error('requireAdmin - Error:', error);
    console.error('requireAdmin - Error details:', {
      message: error.message,
      code: error.code,
      name: error.name,
      stack: error.stack
    });
    next(error);
  }
}

module.exports = { requireAuth, requireVerified, requireAdmin };
