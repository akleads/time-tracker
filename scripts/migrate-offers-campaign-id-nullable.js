require('dotenv').config();
const db = require('../config/database');

async function migrate() {
  try {
    console.log('Running migration: Making offers.campaign_id nullable...');
    
    // SQLite doesn't support ALTER COLUMN to change NOT NULL constraint directly
    // We need to:
    // 1. Create a new table with the updated schema
    // 2. Copy data from old table
    // 3. Drop old table
    // 4. Rename new table
    
    // Step 1: Create new offers table with nullable campaign_id and user_id
    try {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS offers_new (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          campaign_id TEXT,
          name TEXT NOT NULL,
          url TEXT NOT NULL,
          priority INTEGER NOT NULL DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
        )
      `);
      console.log('✓ Created new offers table structure');
    } catch (error) {
      console.log('  Error creating new table (may already exist):', error.message);
      // Try to drop it first if it exists
      try {
        await db.execute('DROP TABLE IF EXISTS offers_new');
        await db.execute(`
          CREATE TABLE offers_new (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            campaign_id TEXT,
            name TEXT NOT NULL,
            url TEXT NOT NULL,
            priority INTEGER NOT NULL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
          )
        `);
        console.log('✓ Created new offers table structure (after cleanup)');
      } catch (err) {
        throw err;
      }
    }
    
    // Step 2: Copy data from old table to new table
    try {
      await db.execute(`
        INSERT INTO offers_new (id, user_id, campaign_id, name, url, priority, created_at)
        SELECT 
          id,
          user_id,
          campaign_id,
          name,
          url,
          priority,
          created_at
        FROM offers
      `);
      console.log('✓ Copied data to new table');
    } catch (error) {
      // If user_id column doesn't exist in old table, handle it gracefully
      if (error.message.includes('no such column: user_id')) {
        console.log('  user_id column not found in old table, copying without it...');
        await db.execute(`
          INSERT INTO offers_new (id, campaign_id, name, url, priority, created_at)
          SELECT 
            id,
            campaign_id,
            name,
            url,
            priority,
            created_at
          FROM offers
        `);
        
        // Populate user_id from campaigns if possible
        try {
          await db.execute(`
            UPDATE offers_new 
            SET user_id = (
              SELECT user_id FROM campaigns 
              WHERE campaigns.id = offers_new.campaign_id
            )
          `);
          console.log('✓ Populated user_id from campaigns');
        } catch (err) {
          console.log('  Could not populate user_id:', err.message);
        }
      } else {
        throw error;
      }
    }
    
    // Step 3: Drop old table
    try {
      await db.execute('DROP TABLE offers');
      console.log('✓ Dropped old offers table');
    } catch (error) {
      console.log('  Error dropping old table:', error.message);
      throw error;
    }
    
    // Step 4: Rename new table
    try {
      await db.execute('ALTER TABLE offers_new RENAME TO offers');
      console.log('✓ Renamed new table to offers');
    } catch (error) {
      console.log('  Error renaming table:', error.message);
      throw error;
    }
    
    // Step 5: Recreate indexes
    try {
      await db.execute('CREATE INDEX IF NOT EXISTS idx_offers_campaign_id ON offers(campaign_id)');
      await db.execute('CREATE INDEX IF NOT EXISTS idx_offers_user_id ON offers(user_id)');
      console.log('✓ Recreated indexes');
    } catch (error) {
      console.log('  Error recreating indexes:', error.message);
    }
    
    console.log('Migration completed successfully!');
    console.log('Note: campaign_id is now nullable, allowing reusable offers without a specific campaign.');
    // Do not exit process here, allow it to be called from API
  } catch (error) {
    console.error('Migration failed:', error);
    throw error; // Re-throw to be caught by API endpoint
  }
}

module.exports = migrate;

// If run directly (not via API)
if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}


