const jwt = require('jsonwebtoken');
const environment = require('../config/environment');
const AppError = require('../utils/AppError');

// Reads "Authorization: Bearer <token>" and puts { id, role } on req.user.
function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(new AppError('Please log in first', 401, 'UNAUTHORIZED'));
  }

  try {
    const payload = jwt.verify(token, environment.jwtAccessSecret);
    req.user = { id: Number(payload.sub), role: payload.role };
    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Your session has expired', 401, 'TOKEN_EXPIRED'));
    }
    return next(new AppError('Invalid login token', 401, 'UNAUTHORIZED'));
  }
}

module.exports = authenticate;
