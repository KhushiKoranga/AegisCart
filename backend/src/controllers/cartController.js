const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/sendResponse');
const { parseId } = require('../validators/idValidator');
const { validateAddToCart, validateQuantity } = require('../validators/cartValidator');
const cartService = require('../services/cartService');

const getCart = asyncHandler(async (req, res) => {
  sendSuccess(res, await cartService.getCart(req.user.id));
});

const addItem = asyncHandler(async (req, res) => {
  const { variantId, quantity } = validateAddToCart(req.body);
  sendSuccess(res, await cartService.addItem(req.user.id, variantId, quantity), 201);
});

const updateItem = asyncHandler(async (req, res) => {
  const quantity = validateQuantity(req.body.quantity);
  sendSuccess(res, await cartService.updateQuantity(req.user.id, parseId(req.params.id, 'Cart item id'), quantity));
});

const removeItem = asyncHandler(async (req, res) => {
  sendSuccess(res, await cartService.removeItem(req.user.id, parseId(req.params.id, 'Cart item id')));
});

module.exports = { getCart, addItem, updateItem, removeItem };
