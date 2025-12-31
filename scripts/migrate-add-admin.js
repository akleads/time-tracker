require('dotenv').config();
const db = require('../config/database');

async function migrate() {
  try {
    console.log('Running migration: Adding admin and verification fields...');
    
    // Add is_admin column (default false)
    try {
      await db.execute(`
        ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0
      `);
      console.log('✓ Added is_admin column');
    } catch (error) {
      if (error.message.includes('duplicate column') || error.message.includes('already exists')) {
        console.log('  is_admin column already exists, skipping');
      } else {
        throw error;
      }
    }
    
    // Add is_verified column (default false)
    try {
      await db.execute(`
        ALTER TABLE users ADD COLUMN is_verified INTEGER DEFAULT 0
      `);
      console.log('✓ Added is_verified column');
    } catch (error) {
      if (error.message.includes('duplicate column') || error.message.includes('already exists')) {
        console.log('  is_verified column already exists, skipping');
      } else {
        throw error;
      }
    }
    
    // Make user "alex" an admin and verified
    try {
      const result = await db.execute({
        sql: 'SELECT id FROM users WHERE username = ?',
        args: ['alex']
      });
      
      if (result.rows.length > 0) {
        await db.execute({
          sql: 'UPDATE users SET is_admin = 1, is_verified = 1 WHERE username = ?',
          args: ['alex']
        });
        console.log('✓ Made user "alex" an admin and verified');
      } else {
        console.log('  User "alex" not found - they will be set as admin when they register');
      }
    } catch (error) {
      console.error('  Error setting alex as admin:', error.message);
    }
    
    // Verify all existing users (except new ones going forward)
    try {
      await db.execute(`
        UPDATE users SET is_verified = 1 WHERE is_verified IS NULL OR is_verified = 0
      `);
      console.log('✓ Verified all existing users');
    } catch (error) {
      console.error('  Error verifying existing users:', error.message);
    }
    
    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();

