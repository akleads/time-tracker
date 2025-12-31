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
    
    // Step 7: Add redtrack_campaign_id to campaigns
    try {
      await db.execute({
        sql: `ALTER TABLE campaigns ADD COLUMN redtrack_campaign_id TEXT`,
        args: []
      });
      results.push({ step: 'redtrack_campaign_id', status: 'added', message: 'Added redtrack_campaign_id column to campaigns' });
    } catch (error) {
      if (error.message && (error.message.includes('duplicate column') || error.message.includes('already exists'))) {
        results.push({ step: 'redtrack_campaign_id', status: 'skipped', message: 'redtrack_campaign_id column already exists' });
      } else {
        throw error;
      }
    }
    
    // Step 8: Add number_of_offers to campaigns
    try {
      await db.execute({
        sql: `ALTER TABLE campaigns ADD COLUMN number_of_offers INTEGER DEFAULT 1`,
        args: []
      });
      results.push({ step: 'number_of_offers', status: 'added', message: 'Added number_of_offers column to campaigns' });
    } catch (error) {
      if (error.message && (error.message.includes('duplicate column') || error.message.includes('already exists'))) {
        results.push({ step: 'number_of_offers', status: 'skipped', message: 'number_of_offers column already exists' });
      } else {
        throw error;
      }
    }
    
    // Step 9: Create campaign_offer_positions table
    try {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS campaign_offer_positions (
          id TEXT PRIMARY KEY,
          campaign_id TEXT NOT NULL,
          position INTEGER NOT NULL,
          title TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
          UNIQUE(campaign_id, position)
        )
      `);
      results.push({ step: 'campaign_offer_positions', status: 'added', message: 'Created campaign_offer_positions table' });
    } catch (error) {
      if (error.message && error.message.includes('already exists')) {
        results.push({ step: 'campaign_offer_positions', status: 'skipped', message: 'campaign_offer_positions table already exists' });
      } else {
        throw error;
      }
    }
    
    // Step 10: Add offer_position to time_rules
    try {
      await db.execute({
        sql: `ALTER TABLE time_rules ADD COLUMN offer_position INTEGER`,
        args: []
      });
      results.push({ step: 'time_rules_offer_position', status: 'added', message: 'Added offer_position column to time_rules' });
      
      // Migrate existing time_rules to use offer_position = 1
      try {
        await db.execute(`
          UPDATE time_rules 
          SET offer_position = 1 
          WHERE offer_position IS NULL
        `);
        results.push({ step: 'migrate_time_rules', status: 'added', message: 'Migrated existing time_rules to use offer_position (defaulted to 1)' });
      } catch (error) {
        console.log('  Error migrating time_rules:', error.message);
        results.push({ step: 'migrate_time_rules', status: 'warning', message: 'Could not migrate existing time_rules: ' + error.message });
      }
    } catch (error) {
      if (error.message && (error.message.includes('duplicate column') || error.message.includes('already exists'))) {
        results.push({ step: 'time_rules_offer_position', status: 'skipped', message: 'offer_position column already exists' });
      } else {
        throw error;
      }
    }
    
    // Step 11: Set default number_of_offers for existing campaigns
    try {
      await db.execute(`
        UPDATE campaigns 
        SET number_of_offers = 1 
        WHERE number_of_offers IS NULL OR number_of_offers = 0
      `);
      results.push({ step: 'set_default_number_of_offers', status: 'added', message: 'Set default number_of_offers for existing campaigns' });
    } catch (error) {
      console.log('  Error setting default number_of_offers:', error.message);
      results.push({ step: 'set_default_number_of_offers', status: 'warning', message: 'Could not set default: ' + error.message });
    }
    
    // Step 12: Create indexes
    try {
      await db.execute(`
        CREATE INDEX IF NOT EXISTS idx_campaign_offer_positions_campaign_id 
        ON campaign_offer_positions(campaign_id)
      `);
      results.push({ step: 'index_campaign_offer_positions', status: 'added', message: 'Created index on campaign_offer_positions' });
    } catch (error) {
      if (error.message && error.message.includes('already exists')) {
        results.push({ step: 'index_campaign_offer_positions', status: 'skipped', message: 'Index already exists' });
      } else {
        console.log('  Error creating index:', error.message);
        results.push({ step: 'index_campaign_offer_positions', status: 'warning', message: 'Could not create index: ' + error.message });
      }
    }
    
    try {
      await db.execute(`
        CREATE INDEX IF NOT EXISTS idx_time_rules_offer_position 
        ON time_rules(offer_position)
      `);
      results.push({ step: 'index_time_rules_offer_position', status: 'added', message: 'Created index on time_rules.offer_position' });
    } catch (error) {
      if (error.message && error.message.includes('already exists')) {
        results.push({ step: 'index_time_rules_offer_position', status: 'skipped', message: 'Index already exists' });
      } else {
        console.log('  Error creating index:', error.message);
        results.push({ step: 'index_time_rules_offer_position', status: 'warning', message: 'Could not create index: ' + error.message });
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
        const tableSql = (schemaResult.rows[0].sql || '').toUpperCase();
        console.log('Offers table schema check:', tableSql.substring(0, 300));
        // Check if campaign_id has NOT NULL constraint
        // Look for pattern: campaign_id TEXT NOT NULL (with NOT NULL)
        const hasNotNullConstraint = tableSql.includes('CAMPAIGN_ID TEXT NOT NULL');
        // If campaign_id exists without NOT NULL, or if user_id exists (table was recreated), it's nullable
        if (tableSql.includes('CAMPAIGN_ID TEXT') && !hasNotNullConstraint) {
          offers_campaign_id_nullable = true;
          console.log('Found campaign_id TEXT without NOT NULL - assuming nullable');
        } else if (tableSql.includes('USER_ID TEXT')) {
          // If user_id exists, table was likely recreated with nullable campaign_id
          offers_campaign_id_nullable = true;
          console.log('Found user_id TEXT - assuming table was migrated and campaign_id is nullable');
        } else if (hasNotNullConstraint) {
          console.log('Found campaign_id TEXT NOT NULL - migration needed');
          offers_campaign_id_nullable = false;
        }
        console.log('offers_campaign_id_nullable check result:', offers_campaign_id_nullable);
      } else {
        console.log('No offers table schema found in sqlite_master');
      }
    } catch (error) {
      // On error, assume migration needed (be conservative)
      console.log('Could not check offers table schema:', error.message);
      offers_campaign_id_nullable = false; // Assume NOT nullable if we can't check
    }
    checks.offers_campaign_id_nullable = offers_campaign_id_nullable;
    
    // Check campaigns.redtrack_campaign_id
    let campaigns_redtrack_campaign_id = false;
    try {
      await db.execute({
        sql: 'SELECT redtrack_campaign_id FROM campaigns LIMIT 1',
        args: []
      });
      campaigns_redtrack_campaign_id = true;
    } catch (error) {
      if (error.message && error.message.includes('no such column: redtrack_campaign_id')) {
        campaigns_redtrack_campaign_id = false;
      } else {
        campaigns_redtrack_campaign_id = true;
      }
    }
    checks.campaigns_redtrack_campaign_id = campaigns_redtrack_campaign_id;
    
    // Check campaigns.number_of_offers
    let campaigns_number_of_offers = false;
    try {
      await db.execute({
        sql: 'SELECT number_of_offers FROM campaigns LIMIT 1',
        args: []
      });
      campaigns_number_of_offers = true;
    } catch (error) {
      if (error.message && error.message.includes('no such column: number_of_offers')) {
        campaigns_number_of_offers = false;
      } else {
        campaigns_number_of_offers = true;
      }
    }
    checks.campaigns_number_of_offers = campaigns_number_of_offers;
    
    // Check time_rules.offer_position
    let time_rules_offer_position = false;
    try {
      await db.execute({
        sql: 'SELECT offer_position FROM time_rules LIMIT 1',
        args: []
      });
      time_rules_offer_position = true;
    } catch (error) {
      if (error.message && error.message.includes('no such column: offer_position')) {
        time_rules_offer_position = false;
      } else {
        time_rules_offer_position = true;
      }
    }
    checks.time_rules_offer_position = time_rules_offer_position;
    
    // Check campaign_offer_positions table
    let campaign_offer_positions_table = false;
    try {
      await db.execute({
        sql: 'SELECT id FROM campaign_offer_positions LIMIT 1',
        args: []
      });
      campaign_offer_positions_table = true;
    } catch (error) {
      if (error.message && error.message.includes('no such table: campaign_offer_positions')) {
        campaign_offer_positions_table = false;
      } else {
        campaign_offer_positions_table = true;
      }
    }
    checks.campaign_offer_positions_table = campaign_offer_positions_table;
    
    const needsMigration = !checks.campaigns_domain_id || !checks.campaigns_fallback_offer_id || 
                          !checks.users_temporary_password_hash || !checks.users_must_change_password ||
                          !checks.time_rules_weight || !checks.offers_campaign_id_nullable ||
                          !checks.campaigns_redtrack_campaign_id || !checks.campaigns_number_of_offers ||
                          !checks.time_rules_offer_position || !checks.campaign_offer_positions_table;
    
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
