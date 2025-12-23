const db = require('../config/database');
const fs = require('fs');
const path = require('path');

async function initDatabase() {
  try {
    console.log('Initializing database...');
    
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split by semicolons and execute each statement
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    for (const statement of statements) {
      try {
        await db.execute(statement);
        console.log('✓ Executed SQL statement');
      } catch (error) {
        // Ignore "table already exists" errors
        if (!error.message.includes('already exists') && !error.message.includes('duplicate')) {
          console.error('Error executing statement:', error.message);
          console.error('Statement:', statement);
        }
      }
    }
    
    console.log('Database initialized successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

initDatabase();
