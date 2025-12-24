const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { randomBytes } = require('crypto');
const db = require('../config/database');
const migrateOffersCampaignIdNullable = require('../scripts/migrate-offers-campaign-id-nullable');

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
    
    // Step 5: Add weight column to time_rules table
    try {
      await db.execute({
        sql: `ALTER TABLE time_rules ADD COLUMN weight INTEGER DEFAULT 100`,
        args: []
      });
      results.push({ step: 'weight', status: 'added', message: 'Added weight column to time_rules' });
    } catch (error) {
      if (error.message && (error.message.includes('duplicate column') || error.message.includes('already exists'))) {
        results.push({ step: 'weight', status: 'skipped', message: 'weight column already exists' });
      } else {
        throw error;
      }
    }
    
    // Step 6: Make offers.campaign_id nullable
    try {
      await migrateOffersCampaignIdNullable();
      results.push({ step: 'offers_campaign_id_nullable', status: 'added', message: 'Made offers.campaign_id nullable' });
    } catch (error) {
      if (error.message && (error.message.includes('already') || error.message.includes('duplicate'))) {
        results.push({ step: 'offers_campaign_id_nullable', status: 'skipped', message: 'campaign_id already nullable' });
      } else {
        console.error('Error making campaign_id nullable:', error);
        results.push({ step: 'offers_campaign_id_nullable', status: 'error', message: 'Error: ' + error.message });
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

async function checkMigrationStatus(req, res, next) {
  try {
    // Check if migration is needed by attempting to query the columns
    // If columns don't exist, migration is needed
    const checks = {
      campaigns_domain_id: false,
      campaigns_fallback_offer_id: false,
      users_temporary_password_hash: false,
      users_must_change_password: false
    };
    
    // Check campaigns.domain_id
    try {
      await db.execute({
        sql: 'SELECT domain_id FROM campaigns LIMIT 1',
        args: []
      });
      checks.campaigns_domain_id = true;
    } catch (error) {
      if (error.message && error.message.includes('no such column: domain_id')) {
        checks.campaigns_domain_id = false;
      } else {
        // If table doesn't exist or other error, assume migration not needed
        checks.campaigns_domain_id = true;
      }
    }
    
    // Check campaigns.fallback_offer_id
    try {
      await db.execute({
        sql: 'SELECT fallback_offer_id FROM campaigns LIMIT 1',
        args: []
      });
      checks.campaigns_fallback_offer_id = true;
    } catch (error) {
      if (error.message && error.message.includes('no such column: fallback_offer_id')) {
        checks.campaigns_fallback_offer_id = false;
      } else {
        checks.campaigns_fallback_offer_id = true;
      }
    }
    
    // Check users.temporary_password_hash
    try {
      await db.execute({
        sql: 'SELECT temporary_password_hash FROM users LIMIT 1',
        args: []
      });
      checks.users_temporary_password_hash = true;
    } catch (error) {
      if (error.message && error.message.includes('no such column: temporary_password_hash')) {
        checks.users_temporary_password_hash = false;
      } else {
        checks.users_temporary_password_hash = true;
      }
    }
    
    // Check users.must_change_password
    try {
      await db.execute({
        sql: 'SELECT must_change_password FROM users LIMIT 1',
        args: []
      });
      checks.users_must_change_password = true;
    } catch (error) {
      if (error.message && error.message.includes('no such column: must_change_password')) {
        checks.users_must_change_password = false;
      } else {
        checks.users_must_change_password = true;
      }
    }
    
    // Check time_rules.weight
    let time_rules_weight = false;
    try {
      await db.execute({
        sql: 'SELECT weight FROM time_rules LIMIT 1',
        args: []
      });
      time_rules_weight = true;
    } catch (error) {
      if (error.message && error.message.includes('no such column: weight')) {
        time_rules_weight = false;
      } else {
        time_rules_weight = true;
      }
    }
    checks.time_rules_weight = time_rules_weight;
    
    // Check if offers.campaign_id is nullable by checking table schema
    let offers_campaign_id_nullable = false;
    try {
      const schemaResult = await db.execute({
        sql: 'SELECT sql FROM sqlite_master WHERE type="table" AND name="offers"',
        args: []
      });
      if (schemaResult.rows && schemaResult.rows.length > 0) {
        const tableSql = schemaResult.rows[0].sql || '';
        // Check if campaign_id TEXT exists without NOT NULL, or if user_id exists (indicating table was recreated)
        if (tableSql.includes('campaign_id TEXT') && !tableSql.includes('campaign_id TEXT NOT NULL')) {
          offers_campaign_id_nullable = true;
        } else if (tableSql.includes('user_id TEXT')) {
          // If user_id exists, table was likely recreated, so campaign_id should be nullable
          offers_campaign_id_nullable = true;
        }
      }
    } catch (error) {
      // On error, assume migration needed
      console.log('Could not check offers table schema:', error.message);
    }
    checks.offers_campaign_id_nullable = offers_campaign_id_nullable;
    
    const needsMigration = !checks.campaigns_domain_id || !checks.campaigns_fallback_offer_id || 
                          !checks.users_temporary_password_hash || !checks.users_must_change_password ||
                          !checks.time_rules_weight || !checks.offers_campaign_id_nullable;
    
    res.json({
      needs_migration: needsMigration,
      checks: checks
    });
  } catch (error) {
    console.error('Error checking migration status:', error);
    // On error, assume migration not needed (don't show warning)
    res.json({
      needs_migration: false,
      error: error.message
    });
  }
}

module.exports = {
  listPendingUsers,
  approveUser,
  rejectUser,
  listAllUsers,
  revokeUser,
  resetUserPassword,
  runMigration,
  checkMigrationStatus
};
