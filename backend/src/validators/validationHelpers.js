// Small checks used by the validators. Each one throws a 400 error with a clear message.
const AppError = require('../utils/AppError');

function fail(message) {
  throw new AppError(message, 400, 'VALIDATION_ERROR');
}

function isMissing(value) {
  return value === undefined || value === null || value === '';
}

function requireText(value, fieldName, maxLength = 255) {
  if (typeof value !== 'string' || value.trim() === '') fail(`${fieldName} is required`);
  const text = value.trim();
  if (text.length > maxLength) fail(`${fieldName} must be at most ${maxLength} characters`);
  return text;
}

function optionalText(value, fieldName, maxLength = 255) {
  return isMissing(value) ? null : requireText(value, fieldName, maxLength);
}

function requireEmail(value) {
  const email = requireText(value, 'Email').toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('Email is not valid');
  return email;
}

function requirePassword(value) {
  if (typeof value !== 'string' || value.length < 8) fail('Password must be at least 8 characters');
  if (value.length > 72) fail('Password must be at most 72 characters'); // bcrypt limit
  return value;
}

function requireInteger(value, fieldName, { min = 1, max = 1000000 } = {}) {
  const number = Number(value);
  if (isMissing(value) || !Number.isInteger(number) || number < min || number > max) {
    fail(`${fieldName} must be a whole number between ${min} and ${max}`);
  }
  return number;
}

function requireMoney(value, fieldName) {
  const number = Number(value);
  if (isMissing(value) || !Number.isFinite(number) || number < 0 || number > 10000000) {
    fail(`${fieldName} must be a valid amount`);
  }
  return Math.round(number * 100) / 100;
}

function requireOneOf(value, allowedValues, fieldName) {
  if (!allowedValues.includes(value)) fail(`${fieldName} must be one of: ${allowedValues.join(', ')}`);
  return value;
}

function requireHttpUrl(value, fieldName) {
  const text = requireText(value, fieldName, 1000);
  if (!/^https?:\/\//i.test(text)) fail(`${fieldName} must start with http:// or https://`);
  return text;
}

function optionalHttpUrl(value, fieldName) {
  return isMissing(value) ? null : requireHttpUrl(value, fieldName);
}

function requireDate(value, fieldName) {
  const date = new Date(value);
  if (isMissing(value) || Number.isNaN(date.getTime())) fail(`${fieldName} must be a valid date`);
  return date.toISOString();
}

module.exports = {
  fail, isMissing, requireText, optionalText, requireEmail, requirePassword, requireInteger,
  requireMoney, requireOneOf, requireHttpUrl, optionalHttpUrl, requireDate,
};
