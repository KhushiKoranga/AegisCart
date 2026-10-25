const { query } = require('../config/database');
const AppError = require('../utils/AppError');
const notificationService = require('./notificationService');

async function listFlashSales() {
  const result = await query(
    `SELECT f.id, f.product_id, f.sale_price, f.starts_at, f.ends_at, f.is_active,
            p.name AS product_name, p.base_price,
            (f.is_active AND NOW() BETWEEN f.starts_at AND f.ends_at) AS is_running
     FROM flash_sales f JOIN products p ON p.id = f.product_id
     ORDER BY f.id DESC`
  );
  return result.rows;
}

async function createFlashSale({ productId, salePrice, startsAt, endsAt }) {
  const productResult = await query('SELECT name, base_price FROM products WHERE id = $1', [productId]);
  const product = productResult.rows[0];
  if (!product) throw new AppError('Product not found', 404, 'NOT_FOUND');
  if (salePrice >= product.basePrice) throw new AppError('The sale price must be lower than the normal price', 400, 'VALIDATION_ERROR');

  const result = await query(
    'INSERT INTO flash_sales (product_id, sale_price, starts_at, ends_at) VALUES ($1, $2, $3, $4) RETURNING id',
    [productId, salePrice, startsAt, endsAt]
  );

  // Tell customers only when the sale is already running.
  if (new Date(startsAt) <= new Date()) {
    notificationService.notifyAllCustomers({
      title: 'Flash sale!',
      body: `${product.name} is now Rs. ${salePrice} (was Rs. ${product.basePrice}).`,
      type: 'FLASH_SALE',
    });
  }
  return result.rows[0];
}

async function setFlashSaleActive(flashSaleId, isActive) {
  const result = await query('UPDATE flash_sales SET is_active = $2 WHERE id = $1 RETURNING id, is_active', [flashSaleId, isActive]);
  if (result.rowCount === 0) throw new AppError('Flash sale not found', 404, 'NOT_FOUND');
  return result.rows[0];
}

async function deleteFlashSale(flashSaleId) {
  const result = await query('DELETE FROM flash_sales WHERE id = $1', [flashSaleId]);
  if (result.rowCount === 0) throw new AppError('Flash sale not found', 404, 'NOT_FOUND');
}

module.exports = { listFlashSales, createFlashSale, setFlashSaleActive, deleteFlashSale };
