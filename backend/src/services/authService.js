const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const environment = require('../config/environment');
const AppError = require('../utils/AppError');
const { ROLES } = require('../utils/constants');
const { createAccessToken, createRefreshToken, hashToken } = require('../utils/tokenUtils');
const notificationService = require('./notificationService');

const PASSWORD_ROUNDS = 10;
// Used when the email does not exist, so a missing account takes as long as a wrong password.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', PASSWORD_ROUNDS);

function toPublicUser(user) {
  return { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role };
}

async function createSession(user) {
  const accessToken = createAccessToken(user);
  const refreshToken = createRefreshToken();
  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, NOW() + make_interval(days => $3))`,
    [user.id, hashToken(refreshToken), environment.refreshTokenDays]
  );
  return { user: toPublicUser(user), accessToken, refreshToken };
}

async function registerCustomer({ name, email, password, phone }) {
  const passwordHash = await bcrypt.hash(password, PASSWORD_ROUNDS);
  try {
    const result = await query(
      `INSERT INTO users (name, email, password_hash, phone, role)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, phone, role`,
      [name, email, passwordHash, phone, ROLES.customer]
    );
    const user = result.rows[0];
    notificationService.notifyUser(user.id, {
      title: 'Welcome to AegisCart',
      body: `Hi ${user.name}, your account is ready. Happy shopping!`,
      type: 'ACCOUNT',
    });
    return createSession(user);
  } catch (error) {
    if (error.code === '23505') throw new AppError('An account with this email already exists', 409, 'EMAIL_EXISTS');
    throw error;
  }
}

// The same function serves customer login and admin login. requiredRole keeps them separate.
async function login({ email, password }, requiredRole) {
  const result = await query('SELECT * FROM users WHERE email = $1', [email]);
  const user = result.rows[0];
  const passwordMatches = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);

  if (!user || !passwordMatches || user.role !== requiredRole) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }
  return createSession(user);
}

// Refresh tokens are used once. A new pair is issued every time (token rotation).
async function refreshSession(refreshToken) {
  // One UPDATE both checks and revokes the token, so two requests cannot reuse it.
  const revoked = await query(
    `UPDATE refresh_tokens SET revoked_at = NOW()
     WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > NOW()
     RETURNING user_id`,
    [hashToken(refreshToken)]
  );
  if (revoked.rowCount === 0) throw new AppError('Please log in again', 401, 'INVALID_REFRESH_TOKEN');

  const userResult = await query('SELECT id, name, email, phone, role FROM users WHERE id = $1', [revoked.rows[0].userId]);
  return createSession(userResult.rows[0]);
}

async function logout(refreshToken) {
  await query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1 AND revoked_at IS NULL', [hashToken(refreshToken)]);
}

module.exports = { registerCustomer, login, refreshSession, logout };
