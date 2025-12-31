require('dotenv').config();
const db = require('../config/database');

async function migrate() {
  try {
    console.log('Running migration: Adding weight column to time_rules...');
    
    // Add weight column to time_rules table (default 100 = 100%)
    try {
      await db.execute({
        sql: `ALTER TABLE time_rules ADD COLUMN weight INTEGER DEFAULT 100`,
        args: []
      });
      console.log('✓ Added weight column to time_rules');
    } catch (error) {
      if (error.message.includes('duplicate column') || error.message.includes('already exists')) {
        console.log('  weight column already exists, skipping');
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


