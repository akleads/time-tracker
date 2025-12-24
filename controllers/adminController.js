const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { randomBytes } = require('crypto');
const db = require('../config/database');

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

async function listAllUsers(req, res, next) {
  try {
    // Admin check is done by requireAdmin middleware
    const allUsers = await User.findAll();
    res.json(allUsers);
  } catch (error) {
    console.error('Error in listAllUsers:', error);
    next(error);
  }
}

async function revokeUser(req, res, next) {
  try {
    // Admin check is done by requireAdmin middleware
    const { id } = req.params;
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Cannot revoke admin users
    const isAdmin = user.is_admin === true || user.is_admin === 1 || user.is_admin === '1';
    if (isAdmin) {
      return res.status(403).json({ error: 'Cannot revoke admin users' });
    }
    
    // Revoke verification (set is_verified to false)
    const updated = await User.update(id, { is_verified: false });
    res.json({
      message: 'User verification revoked successfully',
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

async function resetUserPassword(req, res, next) {
  try {
    // Admin check is done by requireAdmin middleware
    const { id } = req.params;
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Generate temporary password (8 characters, alphanumeric)
    const tempPassword = randomBytes(4).toString('hex');
    const tempPasswordHash = await bcrypt.hash(tempPassword, 10);
    
    // Set temporary password and require password change
    await User.update(id, {
      temporary_password_hash: tempPasswordHash,
      must_change_password: true
    });
    
    res.json({
      message: 'Password reset successfully',
      temporary_password: tempPassword
    });
  } catch (error) {
    next(error);
  }
}

async function runMigration(req, res, next) {
  try {
    // Admin check is done by requireAdmin middleware
    const results = [];
    
    // Step 1: Add domain_id column to campaigns table
    try {
      await db.execute({
        sql: `ALTER TABLE campaigns ADD COLUMN domain_id TEXT`,
        args: []
      });
      results.push({ step: 'domain_id', status: 'added', message: 'Added domain_id column to campaigns' });
    } catch (error) {
      if (error.message && (error.message.includes('duplicate column') || error.message.includes('already exists'))) {
        results.push({ step: 'domain_id', status: 'skipped', message: 'domain_id column already exists' });
      } else {
        throw error;
      }
    }
    
    // Step 2: Add fallback_offer_id column to campaigns table
    try {
      await db.execute({
        sql: `ALTER TABLE campaigns ADD COLUMN fallback_offer_id TEXT`,
        args: []
      });
      results.push({ step: 'fallback_offer_id', status: 'added', message: 'Added fallback_offer_id column to campaigns' });
    } catch (error) {
      if (error.message && (error.message.includes('duplicate column') || error.message.includes('already exists'))) {
        results.push({ step: 'fallback_offer_id', status: 'skipped', message: 'fallback_offer_id column already exists' });
      } else {
        throw error;
      }
    }
    
    // Step 3: Add temporary_password_hash to users table
    try {
      await db.execute({
        sql: `ALTER TABLE users ADD COLUMN temporary_password_hash TEXT`,
        args: []
      });
      results.push({ step: 'temporary_password_hash', status: 'added', message: 'Added temporary_password_hash column to users' });
    } catch (error) {
      if (error.message && (error.message.includes('duplicate column') || error.message.includes('already exists'))) {
        results.push({ step: 'temporary_password_hash', status: 'skipped', message: 'temporary_password_hash column already exists' });
      } else {
        throw error;
      }
    }
    
    // Step 4: Add must_change_password to users table
    try {
      await db.execute({
        sql: `ALTER TABLE users ADD COLUMN must_change_password BOOLEAN DEFAULT 0`,
        args: []
      });
      results.push({ step: 'must_change_password', status: 'added', message: 'Added must_change_password column to users' });
    } catch (error) {
      if (error.message && (error.message.includes('duplicate column') || error.message.includes('already exists'))) {
        results.push({ step: 'must_change_password', status: 'skipped', message: 'must_change_password column already exists' });
      } else {
        throw error;
      }
    }
    
    res.json({
      message: 'Migration completed successfully',
      results: results
    });
  } catch (error) {
    console.error('Migration error:', error);
    next(error);
  }
}

module.exports = {
  listPendingUsers,
  approveUser,
  rejectUser,
  listAllUsers,
  revokeUser,
  resetUserPassword,
  runMigration
};
