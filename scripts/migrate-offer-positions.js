require('dotenv').config();
const db = require('../config/database');

async function migrate() {
  try {
    console.log('Running migration: Refactoring to offer position system...');
    
    // Step 1: Add new columns to campaigns table
    try {
      await db.execute(`
        ALTER TABLE campaigns ADD COLUMN redtrack_campaign_id TEXT
      `);
      console.log('✓ Added redtrack_campaign_id column to campaigns');
    } catch (error) {
      if (error.message.includes('duplicate column') || error.message.includes('already exists')) {
        console.log('  redtrack_campaign_id column already exists, skipping');
      } else {
        throw error;
      }
    }
    
    try {
      await db.execute(`
        ALTER TABLE campaigns ADD COLUMN number_of_offers INTEGER DEFAULT 1
      `);
      console.log('✓ Added number_of_offers column to campaigns');
    } catch (error) {
      if (error.message.includes('duplicate column') || error.message.includes('already exists')) {
        console.log('  number_of_offers column already exists, skipping');
      } else {
        throw error;
      }
    }
    
    // Step 2: Create campaign_offer_positions table to store position titles
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
      console.log('✓ Created campaign_offer_positions table');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('  campaign_offer_positions table already exists, skipping');
      } else {
        throw error;
      }
    }
    
    // Step 3: Add offer_position column to time_rules (replacing offer_id)
    try {
      await db.execute(`
        ALTER TABLE time_rules ADD COLUMN offer_position INTEGER
      `);
      console.log('✓ Added offer_position column to time_rules');
    } catch (error) {
      if (error.message.includes('duplicate column') || error.message.includes('already exists')) {
        console.log('  offer_position column already exists, skipping');
      } else {
        throw error;
      }
    }
    
    // Step 4: Migrate existing time_rules to use offer_position
    // We'll set offer_position to 1 for all existing rules as a default
    // (This is a best-effort migration - user should review their rules)
    try {
      await db.execute(`
        UPDATE time_rules 
        SET offer_position = 1 
        WHERE offer_position IS NULL
      `);
      console.log('✓ Migrated existing time_rules to use offer_position (defaulted to 1)');
    } catch (error) {
      console.log('  Error migrating time_rules:', error.message);
    }
    
    // Step 5: Set default number_of_offers for existing campaigns
    try {
      await db.execute(`
        UPDATE campaigns 
        SET number_of_offers = 1 
        WHERE number_of_offers IS NULL OR number_of_offers = 0
      `);
      console.log('✓ Set default number_of_offers for existing campaigns');
    } catch (error) {
      console.log('  Error setting default number_of_offers:', error.message);
    }
    
    // Step 6: Create index for better performance
    try {
      await db.execute(`
        CREATE INDEX IF NOT EXISTS idx_campaign_offer_positions_campaign_id 
        ON campaign_offer_positions(campaign_id)
      `);
      console.log('✓ Created index on campaign_offer_positions');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('  Index already exists, skipping');
      } else {
        console.log('  Error creating index:', error.message);
      }
    }
    
    try {
      await db.execute(`
        CREATE INDEX IF NOT EXISTS idx_time_rules_offer_position 
        ON time_rules(offer_position)
      `);
      console.log('✓ Created index on time_rules.offer_position');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('  Index already exists, skipping');
      } else {
        console.log('  Error creating index:', error.message);
      }
    }
    
    console.log('\nMigration completed successfully!');
    console.log('\nNote: Existing time_rules have been set to offer_position = 1.');
    console.log('Please review and update your time rules to use the correct offer positions.');
    console.log('\nThe fallback_offer_id and fallback_offer_url columns are still in the database');
    console.log('but will no longer be used. They can be removed in a future cleanup migration.');
    
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();

