const AppError = require('../utils/AppError');
const { ROLES } = require('../utils/constants');

// Must run after authenticate. Blocks everyone who is not an admin.
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== ROLES.admin) {
    return next(new AppError('Admin access is required', 403, 'FORBIDDEN'));
  }
  return next();
}

module.exports = requireAdmin;
