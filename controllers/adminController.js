const User = require('../models/User');

async function listPendingUsers(req, res, next) {
  try {
    // Verify current user is admin
    const currentUser = await User.findById(req.session.userId);
    if (!currentUser) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    console.log('Admin check - User:', currentUser.username, 'is_admin:', currentUser.is_admin);
    
    if (!currentUser.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const pendingUsers = await User.findAllUnverified();
    console.log('Found pending users:', pendingUsers.length);
    res.json(pendingUsers);
  } catch (error) {
    console.error('Error in listPendingUsers:', error);
    next(error);
  }
}

async function approveUser(req, res, next) {
  try {
    // Verify current user is admin
    const currentUser = await User.findById(req.session.userId);
    if (!currentUser || !currentUser.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { id } = req.params;
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const updated = await User.update(id, { is_verified: true });
    res.json({
      message: 'User approved successfully',
      user: {
        id: updated.id,
        username: updated.username,
        email: updated.email,
        is_verified: updated.is_verified
      }
    });
  } catch (error) {
    next(error);
  }
}

async function rejectUser(req, res, next) {
  try {
    // Verify current user is admin
    const currentUser = await User.findById(req.session.userId);
    if (!currentUser || !currentUser.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { id } = req.params;
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Delete the user (reject them)
    await User.delete(id);
    res.json({ message: 'User rejected and removed successfully' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listPendingUsers,
  approveUser,
  rejectUser
};
