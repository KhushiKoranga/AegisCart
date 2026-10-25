const { requireInteger, requireText } = require('./validationHelpers');

function validateCheckout(body, headers) {
  return {
    addressId: requireInteger(body.addressId, 'Address id'),
    // The app sends a new random key for every checkout attempt. Retrying the same attempt reuses it.
    idempotencyKey: requireText(headers['idempotency-key'], 'Idempotency-Key header', 100),
  };
}

function validatePaymentVerification(body) {
  return {
    razorpayOrderId: requireText(body.razorpayOrderId, 'Razorpay order id', 100),
    razorpayPaymentId: requireText(body.razorpayPaymentId, 'Razorpay payment id', 100),
    razorpaySignature: requireText(body.razorpaySignature, 'Razorpay signature', 200),
  };
}

module.exports = { validateCheckout, validatePaymentVerification };
