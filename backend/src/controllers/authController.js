const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/sendResponse');
const { ROLES } = require('../utils/constants');
const { validateRegister, validateLogin, validateRefreshToken } = require('../validators/authValidator');
const authService = require('../services/authService');

const register = asyncHandler(async (req, res) => {
  const session = await authService.registerCustomer(validateRegister(req.body));
  sendSuccess(res, session, 201);
});

const loginCustomer = asyncHandler(async (req, res) => {
  sendSuccess(res, await authService.login(validateLogin(req.body), ROLES.customer));
});

const loginAdmin = asyncHandler(async (req, res) => {
  sendSuccess(res, await authService.login(validateLogin(req.body), ROLES.admin));
});

const refresh = asyncHandler(async (req, res) => {
  sendSuccess(res, await authService.refreshSession(validateRefreshToken(req.body)));
});

const logout = asyncHandler(async (req, res) => {
  await authService.logout(validateRefreshToken(req.body));
  sendSuccess(res, { message: 'Logged out' });
});

module.exports = { register, loginCustomer, loginAdmin, refresh, logout };
