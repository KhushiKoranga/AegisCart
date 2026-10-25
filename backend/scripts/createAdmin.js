// Creates (or updates) the admin account. Run with: npm run create-admin
const bcrypt = require('bcryptjs');
const environment = require('../src/config/environment');
const { query, closePool } = require('../src/config/database');

async function createAdmin() {
  environment.assertRequiredEnvironment();
  const email = (process.env.ADMIN_EMAIL || '').toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || 'Store Admin';

  if (!email || !password || password.length < 8) {
    throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD (at least 8 characters) in backend/.env');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await query(
    `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'ADMIN')
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = 'ADMIN'`,
    [name, email, passwordHash]
  );
  console.log(`Admin account ready: ${email}`);
}

createAdmin()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(closePool);
