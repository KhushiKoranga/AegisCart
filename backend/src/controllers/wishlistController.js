const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/sendResponse');
const { parseId } = require('../validators/idValidator');
const wishlistService = require('../services/wishlistService');

const listWishlist = asyncHandler(async (req, res) => {
  sendSuccess(res, await wishlistService.listWishlist(req.user.id));
});

const addProduct = asyncHandler(async (req, res) => {
  await wishlistService.addToWishlist(req.user.id, parseId(req.body.productId, 'Product id'));
  sendSuccess(res, await wishlistService.listWishlist(req.user.id), 201);
});

const removeProduct = asyncHandler(async (req, res) => {
  await wishlistService.removeFromWishlist(req.user.id, parseId(req.params.productId, 'Product id'));
  sendSuccess(res, await wishlistService.listWishlist(req.user.id));
});

module.exports = { listWishlist, addProduct, removeProduct };
