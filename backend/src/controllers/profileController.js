const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/sendResponse');
const { parseId } = require('../validators/idValidator');
const { validateProfileUpdate, validateAddress, validatePushToken } = require('../validators/profileValidator');
const profileService = require('../services/profileService');
const notificationService = require('../services/notificationService');

const getProfile = asyncHandler(async (req, res) => {
  sendSuccess(res, await profileService.getProfile(req.user.id));
});

const updateProfile = asyncHandler(async (req, res) => {
  sendSuccess(res, await profileService.updateProfile(req.user.id, validateProfileUpdate(req.body)));
});

const listAddresses = asyncHandler(async (req, res) => {
  sendSuccess(res, await profileService.listAddresses(req.user.id));
});

const addAddress = asyncHandler(async (req, res) => {
  sendSuccess(res, await profileService.addAddress(req.user.id, validateAddress(req.body)), 201);
});

const updateAddress = asyncHandler(async (req, res) => {
  const addressId = parseId(req.params.id, 'Address id');
  sendSuccess(res, await profileService.updateAddress(req.user.id, addressId, validateAddress(req.body)));
});

const deleteAddress = asyncHandler(async (req, res) => {
  await profileService.deleteAddress(req.user.id, parseId(req.params.id, 'Address id'));
  sendSuccess(res, { message: 'Address deleted' });
});

const listNotifications = asyncHandler(async (req, res) => {
  sendSuccess(res, await notificationService.listNotifications(req.user.id));
});

const markNotificationsRead = asyncHandler(async (req, res) => {
  await notificationService.markAllAsRead(req.user.id);
  sendSuccess(res, { message: 'Notifications marked as read' });
});

const savePushToken = asyncHandler(async (req, res) => {
  await notificationService.savePushToken(req.user.id, validatePushToken(req.body));
  sendSuccess(res, { message: 'Push token saved' });
});

module.exports = {
  getProfile, updateProfile, listAddresses, addAddress, updateAddress, deleteAddress,
  listNotifications, markNotificationsRead, savePushToken,
};
