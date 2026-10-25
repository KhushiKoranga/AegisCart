const { isMissing, requireInteger, requireMoney, requireOneOf } = require('./validationHelpers');

const SORT_OPTIONS = ['newest', 'price_low', 'price_high'];

// Turns ?search=&categoryId=&minPrice=&maxPrice=&sort=&page= into clean filter values.
function parseProductFilters(query) {
  const filters = { sort: 'newest', page: 1, limit: 20 };
  if (!isMissing(query.search)) filters.search = String(query.search).trim().slice(0, 100);
  if (!isMissing(query.categoryId)) filters.categoryId = requireInteger(query.categoryId, 'Category id');
  if (!isMissing(query.minPrice)) filters.minPrice = requireMoney(query.minPrice, 'Minimum price');
  if (!isMissing(query.maxPrice)) filters.maxPrice = requireMoney(query.maxPrice, 'Maximum price');
  if (!isMissing(query.sort)) filters.sort = requireOneOf(query.sort, SORT_OPTIONS, 'Sort');
  if (!isMissing(query.page)) filters.page = requireInteger(query.page, 'Page', { max: 10000 });
  if (!isMissing(query.limit)) filters.limit = requireInteger(query.limit, 'Limit', { max: 50 });
  if (query.tryOnOnly === 'true') filters.tryOnOnly = true;
  return filters;
}

module.exports = { parseProductFilters };
