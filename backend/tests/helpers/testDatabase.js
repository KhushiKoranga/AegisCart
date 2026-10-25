// Shared setup for tests that need PostgreSQL.
// Set TEST_DATABASE_URL to an EMPTY test database. Its tables are dropped and recreated!
const fs = require('fs');
const path = require('path');

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

// Must be called before the app code is required, because settings are read at load time.
function prepareEnvironment() {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = testDatabaseUrl;
  process.env.JWT_ACCESS_SECRET = 'test_secret_for_unit_tests_only';
  process.env.RAZORPAY_KEY_ID = 'rzp_test_key';
  process.env.RAZORPAY_KEY_SECRET = 'test_key_secret';
  process.env.RAZORPAY_WEBHOOK_SECRET = 'test_webhook_secret';
  process.env.REPLICATE_API_TOKEN = '';
  process.env.REPLICATE_MODEL_VERSION = '';
  process.env.SMTP_HOST = '';
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH = '';
}

// Recreates all tables and loads the sample data.
async function resetDatabase() {
  const { query } = require('../../src/config/database');
  const databaseFolder = path.join(__dirname, '..', '..', '..', 'database');
  await query(fs.readFileSync(path.join(databaseFolder, 'schema.sql'), 'utf8'));
  await query(fs.readFileSync(path.join(databaseFolder, 'seed.sql'), 'utf8'));
}

async function finish() {
  // Notifications are sent in the background, so give them a moment before closing the pool.
  await new Promise((resolve) => setTimeout(resolve, 300));
  await require('../../src/config/database').closePool();
}

module.exports = { testDatabaseUrl, prepareEnvironment, resetDatabase, finish };
