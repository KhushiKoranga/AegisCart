const { requireInteger } = require('./validationHelpers');
const { MAX_QUANTITY_PER_ITEM } = require('../utils/constants');

function validateQuantity(value) {
  return requireInteger(value, 'Quantity', { min: 1, max: MAX_QUANTITY_PER_ITEM });
}

function validateAddToCart(body) {
  return {
    variantId: requireInteger(body.variantId, 'Variant id'),
    quantity: validateQuantity(body.quantity === undefined ? 1 : body.quantity),
  };
}

module.exports = { validateQuantity, validateAddToCart };
