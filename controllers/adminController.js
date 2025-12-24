const User = require('../models/User');

async function listPendingUsers(req, res, next) {
  try {
    // Admin check is done by requireAdmin middleware, so we can proceed
    console.log('listPendingUsers - Starting to fetch pending users');
    const pendingUsers = await User.findAllUnverified();
    console.log('listPendingUsers - Found pending users:', pendingUsers?.length || 0);
    console.log('listPendingUsers - Users:', JSON.stringify(pendingUsers, null, 2));
    
    // Ensure we return an array
    const usersArray = Array.isArray(pendingUsers) ? pendingUsers : [];
    
    res.json(usersArray);
  } catch (error) {
    console.error('Error in listPendingUsers:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    next(error);
  }
}

async function approveUser(req, res, next) {
  try {
    // Admin check is done by requireAdmin middleware
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
    // Admin check is done by requireAdmin middleware
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
