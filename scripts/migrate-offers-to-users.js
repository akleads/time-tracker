require('dotenv').config();
const db = require('../config/database');

async function migrate() {
  try {
    console.log('Running migration: Changing offers from campaign-scoped to user-scoped...');
    
    // Step 1: Add user_id column to offers table
    try {
      await db.execute(`
        ALTER TABLE offers ADD COLUMN user_id TEXT
      `);
      console.log('✓ Added user_id column to offers');
    } catch (error) {
      if (error.message.includes('duplicate column') || error.message.includes('already exists')) {
        console.log('  user_id column already exists, skipping');
      } else {
        throw error;
      }
    }
    
    // Step 2: Populate user_id from campaigns
    try {
      await db.execute(`
        UPDATE offers 
        SET user_id = (
          SELECT user_id FROM campaigns 
          WHERE campaigns.id = offers.campaign_id
        )
      `);
      console.log('✓ Populated user_id for existing offers');
    } catch (error) {
      console.log('  Error populating user_id (may already be done):', error.message);
    }
    
    // Step 3: Add campaign_id to time_rules table (so rules link to both offer and campaign)
    try {
      await db.execute(`
        ALTER TABLE time_rules ADD COLUMN campaign_id TEXT
      `);
      console.log('✓ Added campaign_id column to time_rules');
    } catch (error) {
      if (error.message.includes('duplicate column') || error.message.includes('already exists')) {
        console.log('  campaign_id column already exists in time_rules, skipping');
      } else {
        throw error;
      }
    }
    
    // Step 4: Populate campaign_id in time_rules from offers
    try {
      await db.execute(`
        UPDATE time_rules 
        SET campaign_id = (
          SELECT campaign_id FROM offers 
          WHERE offers.id = time_rules.offer_id
        )
      `);
      console.log('✓ Populated campaign_id for existing time_rules');
    } catch (error) {
      console.log('  Error populating campaign_id in time_rules:', error.message);
    }
    
    console.log('Migration completed successfully!');
    console.log('Note: campaign_id in offers table will be kept for backward compatibility but can be NULL for reusable offers.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();

