const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/sendResponse');
const { parseId } = require('../validators/idValidator');
const { validatePhotoUpload, validateTryOnRequest } = require('../validators/tryOnValidator');
const tryOnService = require('../services/tryOnService');

const uploadPhoto = asyncHandler(async (req, res) => {
  validatePhotoUpload(req.body, req.file);
  sendSuccess(res, await tryOnService.uploadPhoto(req.user.id, req.file), 201);
});

const deletePhoto = asyncHandler(async (req, res) => {
  await tryOnService.deletePhoto(req.user.id, parseId(req.params.photoId, 'Photo id'));
  sendSuccess(res, { message: 'Photo deleted' });
});

// Returns quickly with status "processing". The app then asks for the result with GET /:id.
const createTryOn = asyncHandler(async (req, res) => {
  sendSuccess(res, await tryOnService.createTryOn(req.user.id, validateTryOnRequest(req.body)), 202);
});

const getTryOn = asyncHandler(async (req, res) => {
  sendSuccess(res, await tryOnService.getTryOn(req.user.id, parseId(req.params.id, 'Try-on id')));
});

const listHistory = asyncHandler(async (req, res) => {
  sendSuccess(res, await tryOnService.listHistory(req.user.id));
});

const listSaved = asyncHandler(async (req, res) => {
  sendSuccess(res, await tryOnService.listHistory(req.user.id, { savedOnly: true }));
});

const saveResult = asyncHandler(async (req, res) => {
  sendSuccess(res, await tryOnService.saveResult(req.user.id, parseId(req.params.id, 'Try-on id')));
});

const unsaveResult = asyncHandler(async (req, res) => {
  sendSuccess(res, await tryOnService.unsaveResult(req.user.id, parseId(req.params.id, 'Try-on id')));
});

const deleteTryOn = asyncHandler(async (req, res) => {
  await tryOnService.deleteTryOn(req.user.id, parseId(req.params.id, 'Try-on id'));
  sendSuccess(res, { message: 'Try-on result deleted' });
});

// Private image: only the owner (checked by the service) can download it.
const getImage = asyncHandler(async (req, res) => {
  const image = await tryOnService.getResultImage(req.user.id, parseId(req.params.id, 'Try-on id'));
  res.set({ 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, no-store' });
  res.send(image);
});

module.exports = {
  uploadPhoto, deletePhoto, createTryOn, getTryOn, listHistory, listSaved, saveResult, unsaveResult, deleteTryOn, getImage,
};
