// Pure tests for request validation.
const test = require('node:test');
const assert = require('node:assert');
const { validateRegister } = require('../src/validators/authValidator');
const { validateAddToCart } = require('../src/validators/cartValidator');
const { validatePhotoUpload, validateTryOnRequest } = require('../src/validators/tryOnValidator');

function errorCode(action) {
  try {
    action();
  } catch (error) {
    return error.code;
  }
  return null;
}

test('registration accepts good data and lowercases the email', () => {
  const result = validateRegister({ name: ' Asha ', email: 'ASHA@Example.com', password: 'password123' });
  assert.strictEqual(result.email, 'asha@example.com');
  assert.strictEqual(result.name, 'Asha');
});

test('registration rejects a short password and a bad email', () => {
  assert.strictEqual(errorCode(() => validateRegister({ name: 'A', email: 'a@b.com', password: 'short' })), 'VALIDATION_ERROR');
  assert.strictEqual(errorCode(() => validateRegister({ name: 'A', email: 'not-an-email', password: 'password123' })), 'VALIDATION_ERROR');
});

test('cart quantity must be between 1 and 10', () => {
  assert.strictEqual(validateAddToCart({ variantId: 3 }).quantity, 1);
  assert.strictEqual(errorCode(() => validateAddToCart({ variantId: 3, quantity: 0 })), 'VALIDATION_ERROR');
  assert.strictEqual(errorCode(() => validateAddToCart({ variantId: 3, quantity: 11 })), 'VALIDATION_ERROR');
  assert.strictEqual(errorCode(() => validateAddToCart({ variantId: 3, quantity: 1.5 })), 'VALIDATION_ERROR');
  assert.strictEqual(errorCode(() => validateAddToCart({ variantId: 'abc', quantity: 1 })), 'VALIDATION_ERROR');
});

test('try-on photo upload needs a file and consent', () => {
  const file = { buffer: Buffer.from('x') };
  assert.strictEqual(errorCode(() => validatePhotoUpload({ consentGiven: 'true' }, undefined)), 'VALIDATION_ERROR');
  assert.strictEqual(errorCode(() => validatePhotoUpload({}, file)), 'VALIDATION_ERROR');
  assert.strictEqual(errorCode(() => validatePhotoUpload({ consentGiven: 'true' }, file)), null);
});

test('try-on request needs a photo and a product, the variant is optional', () => {
  assert.strictEqual(errorCode(() => validateTryOnRequest({ productId: 1 })), 'VALIDATION_ERROR');
  assert.strictEqual(validateTryOnRequest({ photoId: 1, productId: 2 }).variantId, null);
  assert.strictEqual(validateTryOnRequest({ photoId: 1, productId: 2, variantId: 5 }).variantId, 5);
});
