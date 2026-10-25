// Pure functions that check Razorpay signatures. They do not touch the database.
const crypto = require('crypto');

function sameText(expected, actual) {
  const expectedBuffer = Buffer.from(String(expected));
  const actualBuffer = Buffer.from(String(actual || ''));
  // timingSafeEqual needs buffers of the same length
  if (expectedBuffer.length !== actualBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

// Checkout signature = HMAC_SHA256(razorpayOrderId + "|" + razorpayPaymentId, keySecret)
function isValidCheckoutSignature({ razorpayOrderId, razorpayPaymentId, signature, keySecret }) {
  if (!keySecret || !razorpayOrderId || !razorpayPaymentId) return false;
  const expected = crypto.createHmac('sha256', keySecret).update(`${razorpayOrderId}|${razorpayPaymentId}`).digest('hex');
  return sameText(expected, signature);
}

// Webhook signature = HMAC_SHA256(raw request body, webhookSecret)
function isValidWebhookSignature({ rawBody, signature, webhookSecret }) {
  if (!webhookSecret || !rawBody) return false;
  const expected = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
  return sameText(expected, signature);
}

module.exports = { isValidCheckoutSignature, isValidWebhookSignature };
