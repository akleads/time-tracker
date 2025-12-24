require('dotenv').config();
const db = require('../config/database');

async function migrate() {
  try {
    console.log('Running migration: Adding domain_id and fallback_offer_id to campaigns...');
    
    // Step 1: Add domain_id column to campaigns table
    try {
      await db.execute(`
        ALTER TABLE campaigns ADD COLUMN domain_id TEXT
      `);
      console.log('✓ Added domain_id column to campaigns');
    } catch (error) {
      if (error.message.includes('duplicate column') || error.message.includes('already exists')) {
        console.log('  domain_id column already exists, skipping');
      } else {
        throw error;
      }
    }
    
    // Step 2: Add fallback_offer_id column to campaigns table
    try {
      await db.execute(`
        ALTER TABLE campaigns ADD COLUMN fallback_offer_id TEXT
      `);
      console.log('✓ Added fallback_offer_id column to campaigns');
    } catch (error) {
      if (error.message.includes('duplicate column') || error.message.includes('already exists')) {
        console.log('  fallback_offer_id column already exists, skipping');
      } else {
        throw error;
      }
    }
    
    // Step 3: Add temporary_password and must_change_password to users table
    try {
      await db.execute(`
        ALTER TABLE users ADD COLUMN temporary_password_hash TEXT
      `);
      console.log('✓ Added temporary_password_hash column to users');
    } catch (error) {
      if (error.message.includes('duplicate column') || error.message.includes('already exists')) {
        console.log('  temporary_password_hash column already exists, skipping');
      } else {
        throw error;
      }
    }
    
    try {
      await db.execute(`
        ALTER TABLE users ADD COLUMN must_change_password BOOLEAN DEFAULT 0
      `);
      console.log('✓ Added must_change_password column to users');
    } catch (error) {
      if (error.message.includes('duplicate column') || error.message.includes('already exists')) {
        console.log('  must_change_password column already exists, skipping');
      } else {
        throw error;
      }
    }
    
    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();

