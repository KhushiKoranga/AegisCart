const express = require('express');
const controller = require('../controllers/paymentController');
const authenticate = require('../middleware/authenticate');
const { paymentLimiter } = require('../middleware/rateLimiters');

const router = express.Router();

// The webhook is called by Razorpay, not by a logged-in customer. It is protected by its signature.
router.post('/webhook', controller.handleWebhook);

router.post('/create-order', authenticate, paymentLimiter, controller.createPaymentOrder);
router.post('/verify', authenticate, paymentLimiter, controller.verifyPayment);

module.exports = router;
