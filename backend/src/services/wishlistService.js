const { query } = require('../config/database');
const AppError = require('../utils/AppError');
const { FLASH_SALE_JOIN, CURRENT_PRICE, PRIMARY_IMAGE } = require('./priceSql');

async function listWishlist(userId) {
  const result = await query(
    `SELECT p.id, p.name, p.base_price, ${CURRENT_PRICE} AS current_price, ${PRIMARY_IMAGE} AS image_url
     FROM wishlists w JOIN products p ON p.id = w.product_id ${FLASH_SALE_JOIN}
     WHERE w.user_id = $1 AND p.is_active = TRUE
     ORDER BY p.id DESC`,
    [userId]
  );
  return result.rows;
}

async function addToWishlist(userId, productId) {
  const product = await query('SELECT id FROM products WHERE id = $1 AND is_active = TRUE', [productId]);
  if (product.rowCount === 0) throw new AppError('Product not found', 404, 'NOT_FOUND');
  await query('INSERT INTO wishlists (user_id, product_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, productId]);
}

async function removeFromWishlist(userId, productId) {
  await query('DELETE FROM wishlists WHERE user_id = $1 AND product_id = $2', [userId, productId]);
}

module.exports = { listWishlist, addToWishlist, removeFromWishlist };
