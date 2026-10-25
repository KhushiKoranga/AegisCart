const { query } = require('../config/database');
const AppError = require('../utils/AppError');
const { FLASH_SALE_JOIN, CURRENT_PRICE, PRIMARY_IMAGE } = require('./priceSql');

const LISTING_SQL = `
  SELECT p.id, p.name, p.base_price, p.is_active, p.try_on_category, p.category_id, c.name AS category_name,
         ${CURRENT_PRICE} AS current_price,
         (fs.sale_price IS NOT NULL AND fs.sale_price < p.base_price) AS on_sale,
         ${PRIMARY_IMAGE} AS image_url,
         COALESCE((SELECT SUM(stock_quantity) FROM product_variants WHERE product_id = p.id), 0) AS total_stock
  FROM products p
  JOIN categories c ON c.id = p.category_id
  ${FLASH_SALE_JOIN}`;

const SORT_SQL = {
  newest: 'id DESC',
  price_low: 'current_price ASC, id DESC',
  price_high: 'current_price DESC, id DESC',
};

// "includeHidden" is used by the admin screen only.
async function listProducts(filters = {}, { includeHidden = false } = {}) {
  const conditions = [];
  const values = [];
  const addCondition = (sql, value) => {
    values.push(value);
    conditions.push(sql.replace('?', `$${values.length}`));
  };

  if (!includeHidden) conditions.push('is_active = TRUE');
  if (filters.search) addCondition('name ILIKE ?', `%${filters.search.replace(/[\\%_]/g, '\\$&')}%`);
  if (filters.categoryId) addCondition('category_id = ?', filters.categoryId);
  if (filters.minPrice !== undefined) addCondition('current_price >= ?', filters.minPrice);
  if (filters.maxPrice !== undefined) addCondition('current_price <= ?', filters.maxPrice);
  if (filters.tryOnOnly) conditions.push('try_on_category IS NOT NULL');

  const limit = filters.limit || 20;
  const offset = ((filters.page || 1) - 1) * limit;
  const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  values.push(limit, offset);

  const result = await query(
    `SELECT * FROM (${LISTING_SQL}) AS listing ${whereSql}
     ORDER BY ${SORT_SQL[filters.sort || 'newest']}
     LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values
  );
  return result.rows;
}

async function getProductDetails(productId, { includeHidden = false } = {}) {
  const productResult = await query(
    `SELECT p.id, p.name, p.description, p.base_price, p.is_active, p.try_on_category, p.category_id,
            c.name AS category_name, ${CURRENT_PRICE} AS current_price
     FROM products p JOIN categories c ON c.id = p.category_id ${FLASH_SALE_JOIN}
     WHERE p.id = $1`,
    [productId]
  );
  const product = productResult.rows[0];
  if (!product || (!product.isActive && !includeHidden)) throw new AppError('Product not found', 404, 'NOT_FOUND');

  const images = await query('SELECT id, image_url, sort_order FROM product_images WHERE product_id = $1 ORDER BY sort_order, id', [productId]);
  const variantResult = await query(
    'SELECT id, size, color, stock_quantity, garment_image_url FROM product_variants WHERE product_id = $1 ORDER BY color, size',
    [productId]
  );
  // A colour can only be tried on when the product has a garment type and this colour has a garment image.
  const variants = variantResult.rows.map((variant) => ({
    ...variant,
    tryOnSupported: Boolean(product.tryOnCategory && variant.garmentImageUrl),
  }));

  const related = await listProducts({ categoryId: product.categoryId, limit: 5 });
  const relatedProducts = related.filter((item) => item.id !== productId).slice(0, 4);

  return { ...product, images: images.rows, variants, relatedProducts };
}

async function listCategories() {
  const result = await query('SELECT id, name FROM categories ORDER BY name');
  return result.rows;
}

module.exports = { listProducts, getProductDetails, listCategories };
