const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/sendResponse');
const { parseId } = require('../validators/idValidator');
const { validateCheckout } = require('../validators/orderValidator');
const orderService = require('../services/orderService');

const createOrder = asyncHandler(async (req, res) => {
  const checkout = validateCheckout(req.body, req.headers);
  sendSuccess(res, await orderService.createOrder(req.user.id, checkout), 201);
});

const listOrders = asyncHandler(async (req, res) => {
  sendSuccess(res, await orderService.listOrdersForCustomer(req.user.id));
});

const getOrder = asyncHandler(async (req, res) => {
  sendSuccess(res, await orderService.getOrderDetails(parseId(req.params.id, 'Order id'), req.user.id));
});

const cancelOrder = asyncHandler(async (req, res) => {
  sendSuccess(res, await orderService.cancelOrderByCustomer(req.user.id, parseId(req.params.id, 'Order id')));
});

module.exports = { createOrder, listOrders, getOrder, cancelOrder };
