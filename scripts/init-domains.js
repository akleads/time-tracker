require('dotenv').config();
const db = require('../config/database');
const fs = require('fs');
const path = require('path');

async function initDomains() {
  try {
    console.log('Initializing domains table...');
    
    // Create domains table
    try {
      await db.execute({
        sql: `CREATE TABLE IF NOT EXISTS domains (
          id TEXT PRIMARY KEY,
          domain TEXT UNIQUE NOT NULL,
          is_active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        args: []
      });
      console.log('✓ Created domains table');
    } catch (error) {
      if (error.message.includes('already exists') || error.message.includes('duplicate')) {
        console.log('  Domains table already exists, skipping');
      } else {
        throw error;
      }
    }
    
    // Create indexes
    try {
      await db.execute({
        sql: 'CREATE INDEX IF NOT EXISTS idx_domains_domain ON domains(domain)',
        args: []
      });
      console.log('✓ Created domain index');
    } catch (error) {
      if (error.message.includes('already exists') || error.message.includes('duplicate')) {
        console.log('  Domain index already exists, skipping');
      } else {
        console.log('  Warning: Could not create domain index:', error.message);
      }
    }
    
    try {
      await db.execute({
        sql: 'CREATE INDEX IF NOT EXISTS idx_domains_active ON domains(is_active)',
        args: []
      });
      console.log('✓ Created active index');
    } catch (error) {
      if (error.message.includes('already exists') || error.message.includes('duplicate')) {
        console.log('  Active index already exists, skipping');
      } else {
        console.log('  Warning: Could not create active index:', error.message);
      }
    }
    
    console.log('Domains table initialized successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing domains:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code
    });
    process.exit(1);
  }
}

initDomains();

