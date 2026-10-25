const { requireInteger } = require('./validationHelpers');

// Route ids such as /orders/:id must be positive whole numbers.
function parseId(value, name = 'Id') {
  return requireInteger(value, name);
}

module.exports = { parseId };
