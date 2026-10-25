const {
  fail, isMissing, requireText, optionalText, requireInteger, requireMoney, requireOneOf,
  requireHttpUrl, optionalHttpUrl, requireDate,
} = require('./validationHelpers');
const { ORDER_STATUS } = require('../utils/constants');

const TRY_ON_CATEGORIES = ['upper_body', 'lower_body', 'dresses'];

function validateCategory(body) {
  return { name: requireText(body.name, 'Category name', 80) };
}

function validateProduct(body) {
  const tryOnCategory = isMissing(body.tryOnCategory) ? null : requireOneOf(body.tryOnCategory, TRY_ON_CATEGORIES, 'Try-on category');
  return {
    categoryId: requireInteger(body.categoryId, 'Category id'),
    name: requireText(body.name, 'Product name', 150),
    description: optionalText(body.description, 'Description', 2000) || '',
    basePrice: requireMoney(body.basePrice, 'Price'),
    tryOnCategory,
  };
}

function validateProductImage(body) {
  return { imageUrl: requireHttpUrl(body.imageUrl, 'Image URL'), sortOrder: isMissing(body.sortOrder) ? 0 : requireInteger(body.sortOrder, 'Sort order', { min: 0 }) };
}

function validateVariant(body) {
  return {
    size: requireText(body.size, 'Size', 20),
    color: requireText(body.color, 'Colour', 40),
    stockQuantity: requireInteger(body.stockQuantity, 'Stock', { min: 0, max: 100000 }),
    garmentImageUrl: optionalHttpUrl(body.garmentImageUrl, 'Garment image URL'),
  };
}

function validateStockUpdate(body) {
  return { newQuantity: requireInteger(body.stockQuantity, 'Stock', { min: 0, max: 100000 }) };
}

function validateFlashSale(body) {
  const startsAt = requireDate(body.startsAt, 'Start time');
  const endsAt = requireDate(body.endsAt, 'End time');
  if (new Date(endsAt) <= new Date(startsAt)) fail('End time must be after the start time');
  return {
    productId: requireInteger(body.productId, 'Product id'),
    salePrice: requireMoney(body.salePrice, 'Sale price'),
    startsAt,
    endsAt,
  };
}

function validateOrderStatusUpdate(body) {
  const allowed = [ORDER_STATUS.shipped, ORDER_STATUS.delivered, ORDER_STATUS.cancelled];
  return requireOneOf(body.status, allowed, 'Status');
}

function validateAvailability(body) {
  if (typeof body.isActive !== 'boolean') fail('isActive must be true or false');
  return body.isActive;
}

module.exports = {
  validateCategory, validateProduct, validateProductImage, validateVariant, validateStockUpdate,
  validateFlashSale, validateOrderStatusUpdate, validateAvailability,
};
