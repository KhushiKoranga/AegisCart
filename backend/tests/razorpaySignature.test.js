// Pure tests: no database or network needed.
const test = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');
const { isValidCheckoutSignature, isValidWebhookSignature } = require('../src/utils/razorpaySignature');

const keySecret = 'my_secret';

function sign(text, secret) {
  return crypto.createHmac('sha256', secret).update(text).digest('hex');
}

test('accepts a correct checkout signature', () => {
  const signature = sign('order_1|pay_1', keySecret);
  assert.strictEqual(isValidCheckoutSignature({ razorpayOrderId: 'order_1', razorpayPaymentId: 'pay_1', signature, keySecret }), true);
});

test('rejects a checkout signature made for another payment', () => {
  const signature = sign('order_1|pay_1', keySecret);
  assert.strictEqual(isValidCheckoutSignature({ razorpayOrderId: 'order_1', razorpayPaymentId: 'pay_2', signature, keySecret }), false);
});

test('rejects a checkout signature of the wrong length or a missing one', () => {
  assert.strictEqual(isValidCheckoutSignature({ razorpayOrderId: 'order_1', razorpayPaymentId: 'pay_1', signature: 'abc', keySecret }), false);
  assert.strictEqual(isValidCheckoutSignature({ razorpayOrderId: 'order_1', razorpayPaymentId: 'pay_1', signature: undefined, keySecret }), false);
});

test('rejects everything when the secret is not configured', () => {
  const signature = sign('order_1|pay_1', '');
  assert.strictEqual(isValidCheckoutSignature({ razorpayOrderId: 'order_1', razorpayPaymentId: 'pay_1', signature, keySecret: '' }), false);
});

test('webhook signature is checked on the exact raw body', () => {
  const rawBody = Buffer.from('{"event":"payment.captured"}');
  const signature = sign(rawBody, 'hook_secret');
  assert.strictEqual(isValidWebhookSignature({ rawBody, signature, webhookSecret: 'hook_secret' }), true);

  const changedBody = Buffer.from('{"event":"payment.captured" }');
  assert.strictEqual(isValidWebhookSignature({ rawBody: changedBody, signature, webhookSecret: 'hook_secret' }), false);
  assert.strictEqual(isValidWebhookSignature({ rawBody, signature, webhookSecret: 'other_secret' }), false);
});
