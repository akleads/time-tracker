require('dotenv').config();
const db = require('../config/database');
const fs = require('fs');
const path = require('path');

async function initDomains() {
  try {
    console.log('Initializing domains table...');
    
    const schemaPath = path.join(__dirname, '../database/schema-domains.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
      try {
        await db.execute({ sql: statement, args: [] });
        console.log('✓ Executed:', statement.substring(0, 50) + '...');
      } catch (error) {
        if (error.message.includes('already exists') || error.message.includes('duplicate')) {
          console.log('  Table/index already exists, skipping');
        } else {
          throw error;
        }
      }
    }
    
    console.log('Domains table initialized successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing domains:', error);
    process.exit(1);
  }
}

initDomains();

