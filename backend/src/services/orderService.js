const { query, runInTransaction } = require('../config/database');
const environment = require('../config/environment');
const AppError = require('../utils/AppError');
const { ORDER_STATUS, PAYMENT_STATUS } = require('../utils/constants');
const { loadCartLines } = require('./cartService');
const inventoryService = require('./inventoryService');
const notificationService = require('./notificationService');

// Which status an admin may move an order to. Paid orders start as CONFIRMED.
const ADMIN_TRANSITIONS = {
  [ORDER_STATUS.confirmed]: [ORDER_STATUS.shipped, ORDER_STATUS.cancelled],
  [ORDER_STATUS.shipped]: [ORDER_STATUS.delivered],
};

const STATUS_MESSAGES = {
  [ORDER_STATUS.shipped]: 'has been shipped',
  [ORDER_STATUS.delivered]: 'has been delivered',
  [ORDER_STATUS.cancelled]: 'has been cancelled. If you paid, a refund will be processed.',
};

function toCents(amount) {
  return Math.round(amount * 100);
}

async function loadAddress(tx, userId, addressId) {
  const result = await tx.query('SELECT * FROM addresses WHERE id = $1 AND user_id = $2', [addressId, userId]);
  if (result.rowCount === 0) throw new AppError('Delivery address not found', 404, 'NOT_FOUND');
  return result.rows[0];
}

function formatAddress(address) {
  const lines = [address.fullName, address.phone, address.line1, address.line2, `${address.city}, ${address.state} ${address.pincode}`];
  return lines.filter(Boolean).join('\n');
}

function checkCartCanBeOrdered(lines) {
  if (lines.length === 0) throw new AppError('Your cart is empty', 400, 'EMPTY_CART');
  const hiddenLine = lines.find((line) => !line.productActive);
  if (hiddenLine) throw new AppError(`${hiddenLine.productName} is no longer available. Please remove it from your cart.`, 409, 'PRODUCT_UNAVAILABLE');
}

// Change the status first. Only the request that changes it from PENDING_PAYMENT may give the stock back,
// so the same order can never release its stock twice.
async function cancelPendingOrder(tx, orderId, newStatus) {
  const updated = await tx.query(
    'UPDATE orders SET status = $2 WHERE id = $1 AND status = $3 RETURNING id',
    [orderId, newStatus, ORDER_STATUS.pendingPayment]
  );
  if (updated.rowCount === 0) return false;
  await inventoryService.releaseOrderStock(tx, orderId);
  return true;
}

// A customer who starts a new checkout gets the stock of their old unpaid orders back first.
async function cancelOldPendingOrders(tx, userId) {
  const oldOrders = await tx.query(
    'SELECT id FROM orders WHERE user_id = $1 AND status = $2 ORDER BY id FOR UPDATE',
    [userId, ORDER_STATUS.pendingPayment]
  );
  for (const order of oldOrders.rows) {
    await cancelPendingOrder(tx, order.id, ORDER_STATUS.cancelled);
  }
}

async function insertOrderItems(tx, orderId, lines) {
  for (const line of lines) {
    await tx.query(
      `INSERT INTO order_items (order_id, variant_id, product_name, size, color, unit_price, quantity)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [orderId, line.variantId, line.productName, line.size, line.color, line.unitPrice, line.quantity]
    );
  }
}

// Everything below runs in ONE transaction: if stock runs out for any item, nothing is saved.
async function placeOrder(tx, userId, addressId, idempotencyKey) {
  const address = await loadAddress(tx, userId, addressId);
  await cancelOldPendingOrders(tx, userId);

  const lines = await loadCartLines(tx, userId);
  checkCartCanBeOrdered(lines);
  const totalCents = lines.reduce((sum, line) => sum + toCents(line.unitPrice) * line.quantity, 0);

  const orderResult = await tx.query(
    `INSERT INTO orders (user_id, address_id, shipping_address, status, total_amount, idempotency_key, reservation_expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW() + make_interval(mins => $7)) RETURNING id`,
    [userId, addressId, formatAddress(address), ORDER_STATUS.pendingPayment, totalCents / 100, idempotencyKey, environment.reservationMinutes]
  );
  const orderId = orderResult.rows[0].id;

  const itemsToReserve = lines.map((line) => ({
    variantId: line.variantId,
    quantity: line.quantity,
    label: `${line.productName} (${line.size}, ${line.color})`,
  }));
  await inventoryService.reserveItems(tx, itemsToReserve, orderId);
  await insertOrderItems(tx, orderId, lines);
  return orderId;
}

async function findOrderIdByKey(userId, idempotencyKey) {
  const result = await query('SELECT id FROM orders WHERE user_id = $1 AND idempotency_key = $2', [userId, idempotencyKey]);
  return result.rowCount > 0 ? result.rows[0].id : null;
}

// If the app retries the same request (same Idempotency-Key), we return the existing order.
async function createOrder(userId, { addressId, idempotencyKey }) {
  const existingOrderId = await findOrderIdByKey(userId, idempotencyKey);
  if (existingOrderId) return getOrderDetails(existingOrderId, userId);

  try {
    const orderId = await runInTransaction((tx) => placeOrder(tx, userId, addressId, idempotencyKey));
    return getOrderDetails(orderId, userId);
  } catch (error) {
    // Two identical requests at the same moment: the database unique rule stops the second one.
    if (error.code === '23505') {
      const orderId = await findOrderIdByKey(userId, idempotencyKey);
      if (orderId) return getOrderDetails(orderId, userId);
    }
    throw error;
  }
}

// userId is optional: admins read any order, customers only their own.
async function getOrderDetails(orderId, userId = null) {
  const values = userId ? [orderId, userId] : [orderId];
  const orderResult = await query(
    `SELECT o.id, o.user_id, o.status, o.total_amount, o.shipping_address, o.reservation_expires_at, o.created_at,
            pay.status AS payment_status
     FROM orders o LEFT JOIN payments pay ON pay.order_id = o.id
     WHERE o.id = $1 ${userId ? 'AND o.user_id = $2' : ''}`,
    values
  );
  if (orderResult.rowCount === 0) throw new AppError('Order not found', 404, 'NOT_FOUND');

  const items = await query(
    'SELECT id, variant_id, product_name, size, color, unit_price, quantity FROM order_items WHERE order_id = $1 ORDER BY id',
    [orderId]
  );
  return { ...orderResult.rows[0], items: items.rows };
}

async function listOrdersForCustomer(userId) {
  const result = await query(
    `SELECT o.id, o.status, o.total_amount, o.created_at, pay.status AS payment_status,
            (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) AS item_count
     FROM orders o LEFT JOIN payments pay ON pay.order_id = o.id
     WHERE o.user_id = $1 ORDER BY o.created_at DESC`,
    [userId]
  );
  return result.rows;
}

async function cancelOrderByCustomer(userId, orderId) {
  await runInTransaction(async (tx) => {
    const found = await tx.query('SELECT id FROM orders WHERE id = $1 AND user_id = $2', [orderId, userId]);
    if (found.rowCount === 0) throw new AppError('Order not found', 404, 'NOT_FOUND');
    const cancelled = await cancelPendingOrder(tx, orderId, ORDER_STATUS.cancelled);
    if (!cancelled) throw new AppError('Only orders that are waiting for payment can be cancelled', 409, 'CANNOT_CANCEL');
  });
  return getOrderDetails(orderId, userId);
}

// Called by the background job. Gives back the stock of unpaid orders whose time ran out.
async function expireUnpaidOrders() {
  const overdue = await query(
    'SELECT id FROM orders WHERE status = $1 AND reservation_expires_at < NOW() ORDER BY id LIMIT 50',
    [ORDER_STATUS.pendingPayment]
  );
  let expiredCount = 0;
  for (const order of overdue.rows) {
    const expired = await runInTransaction((tx) => cancelPendingOrder(tx, order.id, ORDER_STATUS.expired));
    if (expired) expiredCount += 1;
  }
  return expiredCount;
}

// ---------- admin ----------

async function listOrdersForAdmin(status) {
  const values = status ? [status] : [];
  const result = await query(
    `SELECT o.id, o.status, o.total_amount, o.created_at, u.name AS customer_name, u.email AS customer_email,
            pay.status AS payment_status
     FROM orders o JOIN users u ON u.id = o.user_id LEFT JOIN payments pay ON pay.order_id = o.id
     ${status ? 'WHERE o.status = $1' : ''}
     ORDER BY o.created_at DESC LIMIT 200`,
    values
  );
  return result.rows;
}

async function updateOrderStatus(orderId, newStatus) {
  const customerId = await runInTransaction(async (tx) => {
    const orderResult = await tx.query('SELECT id, user_id, status FROM orders WHERE id = $1 FOR UPDATE', [orderId]);
    if (orderResult.rowCount === 0) throw new AppError('Order not found', 404, 'NOT_FOUND');
    const order = orderResult.rows[0];

    const allowedStatuses = ADMIN_TRANSITIONS[order.status] || [];
    if (!allowedStatuses.includes(newStatus)) {
      throw new AppError(`An order that is ${order.status} cannot be changed to ${newStatus}`, 409, 'INVALID_STATUS_CHANGE');
    }

    await tx.query('UPDATE orders SET status = $2 WHERE id = $1', [orderId, newStatus]);
    if (newStatus === ORDER_STATUS.cancelled) {
      // Paid order cancelled: put the stock back and flag the payment so the admin refunds it in Razorpay.
      await inventoryService.releaseOrderStock(tx, orderId);
      await tx.query('UPDATE payments SET status = $2, updated_at = NOW() WHERE order_id = $1 AND status = $3',
        [orderId, PAYMENT_STATUS.needsRefund, PAYMENT_STATUS.paid]);
    }
    return order.userId;
  });

  notificationService.notifyUser(customerId, {
    title: 'Order update',
    body: `Your order #${orderId} ${STATUS_MESSAGES[newStatus]}.`,
    type: 'ORDER_STATUS',
  });
  return getOrderDetails(orderId);
}

module.exports = {
  createOrder, getOrderDetails, listOrdersForCustomer, cancelOrderByCustomer, expireUnpaidOrders,
  cancelPendingOrder, listOrdersForAdmin, updateOrderStatus,
};
