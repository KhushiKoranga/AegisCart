const { query } = require('../config/database');
const AppError = require('../utils/AppError');
const { MAX_QUANTITY_PER_ITEM } = require('../utils/constants');
const { FLASH_SALE_JOIN, CURRENT_PRICE, PRIMARY_IMAGE } = require('./priceSql');

// Reads the cart with current prices and stock. Also used by checkout.
// "executor" can be the normal query helper or a transaction object.
async function loadCartLines(executor, userId) {
  const result = await executor.query(
    `SELECT ci.id AS cart_item_id, ci.quantity, v.id AS variant_id, v.size, v.color, v.stock_quantity,
            p.id AS product_id, p.name AS product_name, p.is_active AS product_active,
            ${CURRENT_PRICE} AS unit_price, ${PRIMARY_IMAGE} AS image_url
     FROM cart_items ci
     JOIN product_variants v ON v.id = ci.variant_id
     JOIN products p ON p.id = v.product_id
     ${FLASH_SALE_JOIN}
     WHERE ci.user_id = $1
     ORDER BY ci.id`,
    [userId]
  );
  return result.rows;
}

async function getCart(userId) {
  const lines = await loadCartLines({ query }, userId);
  const items = lines.map((line) => ({
    ...line,
    lineTotal: Math.round(line.unitPrice * 100) * line.quantity / 100,
    inStock: line.productActive && line.stockQuantity >= line.quantity,
  }));
  const subtotal = items.reduce((sum, item) => sum + Math.round(item.lineTotal * 100), 0) / 100;
  return { items, subtotal, total: subtotal, itemCount: items.reduce((sum, item) => sum + item.quantity, 0) };
}

// Adding to the cart does NOT reserve stock. Stock is reserved only at checkout.
async function addItem(userId, variantId, quantity) {
  const variantResult = await query(
    `SELECT v.stock_quantity, p.is_active, COALESCE(ci.quantity, 0) AS quantity_in_cart
     FROM product_variants v
     JOIN products p ON p.id = v.product_id
     LEFT JOIN cart_items ci ON ci.variant_id = v.id AND ci.user_id = $2
     WHERE v.id = $1`,
    [variantId, userId]
  );
  const variant = variantResult.rows[0];
  if (!variant || !variant.isActive) throw new AppError('Product variant not found', 404, 'NOT_FOUND');

  const newQuantity = variant.quantityInCart + quantity;
  if (newQuantity > MAX_QUANTITY_PER_ITEM) throw new AppError(`You can buy at most ${MAX_QUANTITY_PER_ITEM} of one item`, 400, 'QUANTITY_LIMIT');
  if (newQuantity > variant.stockQuantity) throw new AppError(`Only ${variant.stockQuantity} left in stock`, 409, 'OUT_OF_STOCK');

  await query(
    `INSERT INTO cart_items (user_id, variant_id, quantity) VALUES ($1, $2, $3)
     ON CONFLICT (user_id, variant_id) DO UPDATE SET quantity = EXCLUDED.quantity`,
    [userId, variantId, newQuantity]
  );
  return getCart(userId);
}

async function updateQuantity(userId, cartItemId, quantity) {
  const itemResult = await query(
    `SELECT v.stock_quantity FROM cart_items ci JOIN product_variants v ON v.id = ci.variant_id
     WHERE ci.id = $1 AND ci.user_id = $2`,
    [cartItemId, userId]
  );
  if (itemResult.rowCount === 0) throw new AppError('Cart item not found', 404, 'NOT_FOUND');

  const stock = itemResult.rows[0].stockQuantity;
  if (quantity > stock) throw new AppError(`Only ${stock} left in stock`, 409, 'OUT_OF_STOCK');

  await query('UPDATE cart_items SET quantity = $3 WHERE id = $1 AND user_id = $2', [cartItemId, userId, quantity]);
  return getCart(userId);
}

async function removeItem(userId, cartItemId) {
  const result = await query('DELETE FROM cart_items WHERE id = $1 AND user_id = $2', [cartItemId, userId]);
  if (result.rowCount === 0) throw new AppError('Cart item not found', 404, 'NOT_FOUND');
  return getCart(userId);
}

module.exports = { loadCartLines, getCart, addItem, updateQuantity, removeItem };
