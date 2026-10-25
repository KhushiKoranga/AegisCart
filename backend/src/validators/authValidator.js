const { requireText, optionalText, requireEmail, requirePassword } = require('./validationHelpers');

function validateRegister(body) {
  return {
    name: requireText(body.name, 'Name', 100),
    email: requireEmail(body.email),
    password: requirePassword(body.password),
    phone: optionalText(body.phone, 'Phone', 20),
  };
}

function validateLogin(body) {
  return {
    email: requireEmail(body.email),
    password: requireText(body.password, 'Password', 72),
  };
}

function validateRefreshToken(body) {
  return requireText(body.refreshToken, 'Refresh token', 200);
}

module.exports = { validateRegister, validateLogin, validateRefreshToken };
