// All stock changes happen here. Stock is kept per product variant (size + colour).
//
// Example: a variant has 1 item left and two customers press "Pay" at the same time.
//   Customer A: UPDATE ... SET stock = stock - 1 WHERE id = 7 AND stock >= 1   -> 1 row changed, stock is now 0
//   Customer B: the same UPDATE waits for A, then re-checks "stock >= 1" -> false -> 0 rows changed
// B gets "out of stock". Checking and changing the stock is ONE statement, so there is no gap
// between "check" and "update" where another customer could sneak in.
const { query, runInTransaction } = require('../config/database');
const AppError = require('../utils/AppError');

async function writeInventoryLog(tx, { variantId, orderId = null, changedBy = null, changeAmount, stockAfter, reason }) {
  await tx.query(
    `INSERT INTO inventory_logs (variant_id, order_id, changed_by, change_amount, stock_after, reason)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [variantId, orderId, changedBy, changeAmount, stockAfter, reason]
  );
}

// Reserve stock only when enough is available. Throws OUT_OF_STOCK otherwise.
async function reserveStock(tx, { variantId, quantity, orderId = null, label = 'This item' }) {
  const result = await tx.query(
    `UPDATE product_variants
     SET stock_quantity = stock_quantity - $2
     WHERE id = $1 AND stock_quantity >= $2
     RETURNING stock_quantity`,
    [variantId, quantity]
  );
  if (result.rowCount === 0) {
    throw new AppError(`${label} is out of stock or has fewer items than you asked for`, 409, 'OUT_OF_STOCK');
  }
  await writeInventoryLog(tx, {
    variantId, orderId, changeAmount: -quantity, stockAfter: result.rows[0].stockQuantity, reason: 'RESERVED',
  });
}

// Always lock variants in the same order (lowest id first). Two orders that share items
// then wait for each other in a line instead of deadlocking.
async function reserveItems(tx, items, orderId) {
  const sortedItems = [...items].sort((a, b) => a.variantId - b.variantId);
  for (const item of sortedItems) {
    await reserveStock(tx, { variantId: item.variantId, quantity: item.quantity, orderId, label: item.label });
  }
}

// Gives the stock of a whole order back. The caller must make sure this runs only once per order
// (orderService does that by changing the order status first).
async function releaseOrderStock(tx, orderId) {
  const items = await tx.query('SELECT variant_id, quantity FROM order_items WHERE order_id = $1 ORDER BY variant_id', [orderId]);
  for (const item of items.rows) {
    const result = await tx.query(
      'UPDATE product_variants SET stock_quantity = stock_quantity + $2 WHERE id = $1 RETURNING stock_quantity',
      [item.variantId, item.quantity]
    );
    await writeInventoryLog(tx, {
      variantId: item.variantId, orderId, changeAmount: item.quantity, stockAfter: result.rows[0].stockQuantity, reason: 'RELEASED',
    });
  }
}

// Admin sets the stock to an exact number.
async function setStockByAdmin({ variantId, newQuantity, adminId }) {
  return runInTransaction(async (tx) => {
    const current = await tx.query('SELECT stock_quantity FROM product_variants WHERE id = $1 FOR UPDATE', [variantId]);
    if (current.rowCount === 0) throw new AppError('Variant not found', 404, 'NOT_FOUND');

    await tx.query('UPDATE product_variants SET stock_quantity = $2 WHERE id = $1', [variantId, newQuantity]);
    await writeInventoryLog(tx, {
      variantId, changedBy: adminId, changeAmount: newQuantity - current.rows[0].stockQuantity,
      stockAfter: newQuantity, reason: 'ADMIN_ADJUSTMENT',
    });
    return { variantId, stockQuantity: newQuantity };
  });
}

async function listInventoryLogs(limit = 100) {
  const result = await query(
    `SELECT l.id, l.variant_id, l.order_id, l.change_amount, l.stock_after, l.reason, l.created_at,
            p.name AS product_name, v.size, v.color, u.name AS changed_by_name
     FROM inventory_logs l
     JOIN product_variants v ON v.id = l.variant_id
     JOIN products p ON p.id = v.product_id
     LEFT JOIN users u ON u.id = l.changed_by
     ORDER BY l.id DESC LIMIT $1`,
    [limit]
  );
  return result.rows;
}

module.exports = { writeInventoryLog, reserveStock, reserveItems, releaseOrderStock, setStockByAdmin, listInventoryLogs };
