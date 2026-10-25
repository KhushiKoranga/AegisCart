const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/sendResponse');
const { parseId } = require('../validators/idValidator');
const { validatePaymentVerification } = require('../validators/orderValidator');
const paymentService = require('../services/paymentService');

const createPaymentOrder = asyncHandler(async (req, res) => {
  const orderId = parseId(req.body.orderId, 'Order id');
  sendSuccess(res, await paymentService.createPaymentOrder(req.user.id, orderId));
});

const verifyPayment = asyncHandler(async (req, res) => {
  sendSuccess(res, await paymentService.verifyPayment(req.user.id, validatePaymentVerification(req.body)));
});

// req.body is the raw Buffer here, because the route uses express.raw (see app.js).
const handleWebhook = asyncHandler(async (req, res) => {
  await paymentService.handleWebhook({
    rawBody: req.body,
    signature: req.headers['x-razorpay-signature'],
    eventId: req.headers['x-razorpay-event-id'],
  });
  // Always answer 200 for a valid webhook, otherwise Razorpay keeps retrying.
  res.status(200).json({ success: true });
});

module.exports = { createPaymentOrder, verifyPayment, handleWebhook };
