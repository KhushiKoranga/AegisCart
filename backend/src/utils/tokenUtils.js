const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const environment = require('../config/environment');

function createAccessToken(user) {
  return jwt.sign({ sub: String(user.id), role: user.role }, environment.jwtAccessSecret, {
    expiresIn: `${environment.accessTokenMinutes}m`,
  });
}

// The refresh token is a random string. Only its hash is saved in the database.
function createRefreshToken() {
  return crypto.randomBytes(48).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

module.exports = { createAccessToken, createRefreshToken, hashToken };
