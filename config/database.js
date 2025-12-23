const { createClient } = require('@libsql/client');

const dbUrl = process.env.TURSO_DATABASE_URL;
const dbAuthToken = process.env.TURSO_AUTH_TOKEN;

if (!dbUrl || !dbAuthToken) {
  throw new Error('TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set in environment variables');
}

const db = createClient({
  url: dbUrl,
  authToken: dbAuthToken,
});

module.exports = db;
