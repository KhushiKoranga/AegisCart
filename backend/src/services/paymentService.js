// Three different things happen in a payment, and they are kept separate on purpose:
//   1. createPaymentOrder  - we ask Razorpay for a payment order (no money moved yet)
//   2. the customer pays   - Razorpay tells us, either through verifyPayment or through the webhook
//   3. applyCapturedPayment - ONLY here is the order marked as paid
const crypto = require('crypto');
const { query, runInTransaction } = require('../config/database');
const environment = require('../config/environment');
const AppError = require('../utils/AppError');
const { ORDER_STATUS, PAYMENT_STATUS } = require('../utils/constants');
const { isValidCheckoutSignature, isValidWebhookSignature } = require('../utils/razorpaySignature');
const inventoryService = require('./inventoryService');
const notificationService = require('./notificationService');
const orderService = require('./orderService');

function getRazorpayClient() {
  const { keyId, keySecret } = environment.razorpay;
  if (!keyId || !keySecret) {
    throw new AppError('Payments are not set up. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to backend/.env', 503, 'PAYMENTS_NOT_CONFIGURED');
  }
  const Razorpay = require('razorpay');
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

async function loadOwnedOrder(userId, orderId) {
  const result = await query('SELECT * FROM orders WHERE id = $1 AND user_id = $2', [orderId, userId]);
  if (result.rowCount === 0) throw new AppError('Order not found', 404, 'NOT_FOUND');
  return result.rows[0];
}

function buildCheckoutDetails(payment, order) {
  return {
    keyId: environment.razorpay.keyId,
    razorpayOrderId: payment.razorpayOrderId,
    amountInPaise: Math.round(order.totalAmount * 100),
    currency: 'INR',
    orderId: order.id,
  };
}

// Step 1. The slow Razorpay call happens with no database transaction open.
async function createPaymentOrder(userId, orderId) {
  const order = await loadOwnedOrder(userId, orderId);
  if (order.status !== ORDER_STATUS.pendingPayment) {
    throw new AppError('This order is not waiting for payment', 409, 'ORDER_NOT_PAYABLE');
  }
  if (new Date(order.reservationExpiresAt) < new Date()) {
    throw new AppError('Your reserved items expired. Please checkout again.', 409, 'RESERVATION_EXPIRED');
  }

  // A retry after a failed payment reuses the same Razorpay order.
  const existing = await query('SELECT razorpay_order_id FROM payments WHERE order_id = $1', [orderId]);
  if (existing.rowCount > 0) return buildCheckoutDetails(existing.rows[0], order);

  let razorpayOrder;
  try {
    razorpayOrder = await getRazorpayClient().orders.create({
      amount: Math.round(order.totalAmount * 100),
      currency: 'INR',
      receipt: `order_${order.id}`,
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('Razorpay order creation failed:', error.error || error.message);
    throw new AppError('Could not start the payment. Please try again.', 502, 'PAYMENT_PROVIDER_ERROR');
  }

  await query(
    `INSERT INTO payments (order_id, razorpay_order_id, amount) VALUES ($1, $2, $3)
     ON CONFLICT (order_id) DO NOTHING`,
    [orderId, razorpayOrder.id, order.totalAmount]
  );
  const saved = await query('SELECT razorpay_order_id FROM payments WHERE order_id = $1', [orderId]);
  return buildCheckoutDetails(saved.rows[0], order);
}

async function markOrderAsPaid(tx, order, payment, razorpayPaymentId) {
  await tx.query('UPDATE orders SET status = $2 WHERE id = $1', [order.id, ORDER_STATUS.confirmed]);
  await tx.query(
    'UPDATE payments SET status = $2, razorpay_payment_id = $3, updated_at = NOW() WHERE id = $1',
    [payment.id, PAYMENT_STATUS.paid, razorpayPaymentId]
  );
  // Remove only the ordered variants from the cart.
  await tx.query(
    `DELETE FROM cart_items WHERE user_id = $1
     AND variant_id IN (SELECT variant_id FROM order_items WHERE order_id = $2)`,
    [order.userId, order.id]
  );
}

// The customer paid after the reservation expired, so the stock went back to the shelf.
// Try to take it again. A SAVEPOINT lets us undo only this attempt if stock is gone.
async function reserveAgainForLatePayment(tx, order) {
  const items = await tx.query('SELECT variant_id, quantity, product_name FROM order_items WHERE order_id = $1', [order.id]);
  const itemsToReserve = items.rows.map((item) => ({ variantId: item.variantId, quantity: item.quantity, label: item.productName }));

  await tx.query('SAVEPOINT late_payment');
  try {
    await inventoryService.reserveItems(tx, itemsToReserve, order.id);
    await tx.query('RELEASE SAVEPOINT late_payment');
    return true;
  } catch (error) {
    if (!(error instanceof AppError)) throw error;
    await tx.query('ROLLBACK TO SAVEPOINT late_payment');
    return false;
  }
}

// Step 3. Safe to call many times for the same payment: only the first call changes anything.
async function applyCapturedPayment(tx, razorpayOrderId, razorpayPaymentId) {
  const paymentResult = await tx.query('SELECT * FROM payments WHERE razorpay_order_id = $1 FOR UPDATE', [razorpayOrderId]);
  const payment = paymentResult.rows[0];
  if (!payment) return { outcome: 'UNKNOWN_PAYMENT' };
  if (payment.status === PAYMENT_STATUS.paid || payment.status === PAYMENT_STATUS.needsRefund) {
    return { outcome: 'ALREADY_PROCESSED', orderId: payment.orderId };
  }

  const orderResult = await tx.query('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [payment.orderId]);
  const order = orderResult.rows[0];
  const result = { orderId: order.id, userId: order.userId };

  if (order.status === ORDER_STATUS.pendingPayment) {
    await markOrderAsPaid(tx, order, payment, razorpayPaymentId);
    return { ...result, outcome: 'PAID' };
  }

  const stockWasReleased = [ORDER_STATUS.expired, ORDER_STATUS.cancelled].includes(order.status);
  if (!stockWasReleased) return { ...result, outcome: 'ALREADY_PROCESSED' };

  if (await reserveAgainForLatePayment(tx, order)) {
    await markOrderAsPaid(tx, order, payment, razorpayPaymentId);
    return { ...result, outcome: 'PAID' };
  }

  // Money was received but the items are gone. A PostgreSQL rollback cannot undo a real payment,
  // so we record it and an admin refunds it from the Razorpay dashboard.
  await tx.query(
    'UPDATE payments SET status = $2, razorpay_payment_id = $3, updated_at = NOW() WHERE id = $1',
    [payment.id, PAYMENT_STATUS.needsRefund, razorpayPaymentId]
  );
  return { ...result, outcome: 'NEEDS_REFUND' };
}

// Notifications are sent after COMMIT, and only when something really changed.
function notifyAboutOutcome(result) {
  if (result.outcome === 'PAID') {
    notificationService.notifyUser(result.userId, {
      title: 'Order confirmed',
      body: `We received your payment and your order #${result.orderId} is confirmed.`,
      type: 'ORDER_CONFIRMED',
    });
  }
  if (result.outcome === 'NEEDS_REFUND') {
    console.warn(`Order ${result.orderId}: payment received but stock is gone. Refund needed.`);
    notificationService.notifyUser(result.userId, {
      title: 'Payment received, order not placed',
      body: `Your payment for order #${result.orderId} arrived after the items were released and they sold out. We will refund you.`,
      type: 'PAYMENT_REFUND',
    });
  }
  if (result.outcome === 'PAYMENT_FAILED' && result.userId) {
    notificationService.notifyUser(result.userId, {
      title: 'Payment failed',
      body: `Your payment for order #${result.orderId} did not go through. You can try again from your orders.`,
      type: 'PAYMENT_FAILED',
    });
  }
}

async function confirmPayment(razorpayOrderId, razorpayPaymentId) {
  const result = await runInTransaction((tx) => applyCapturedPayment(tx, razorpayOrderId, razorpayPaymentId));
  notifyAboutOutcome(result);
  return result;
}

// Called by the app right after Razorpay Checkout finishes. The signature proves the
// payment really came from Razorpay, so a fake "success" from the app is rejected.
async function verifyPayment(userId, { razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
  const paymentResult = await query(
    `SELECT pay.order_id, o.user_id FROM payments pay JOIN orders o ON o.id = pay.order_id
     WHERE pay.razorpay_order_id = $1`,
    [razorpayOrderId]
  );
  const payment = paymentResult.rows[0];
  if (!payment || payment.userId !== userId) throw new AppError('Payment not found', 404, 'NOT_FOUND');

  const signatureIsValid = isValidCheckoutSignature({
    razorpayOrderId, razorpayPaymentId, signature: razorpaySignature, keySecret: environment.razorpay.keySecret,
  });
  if (!signatureIsValid) throw new AppError('Payment verification failed', 400, 'INVALID_PAYMENT_SIGNATURE');

  await confirmPayment(razorpayOrderId, razorpayPaymentId);
  return orderService.getOrderDetails(payment.orderId, userId);
}

async function markPaymentFailed(tx, razorpayOrderId) {
  const result = await tx.query(
    `UPDATE payments SET status = $2, updated_at = NOW()
     WHERE razorpay_order_id = $1 AND status = $3 RETURNING order_id`,
    [razorpayOrderId, PAYMENT_STATUS.failed, PAYMENT_STATUS.created]
  );
  if (result.rowCount === 0) return { outcome: 'IGNORED' };

  // The order stays PENDING_PAYMENT so the customer can retry until the reservation expires.
  const order = await tx.query('SELECT id, user_id FROM orders WHERE id = $1', [result.rows[0].orderId]);
  return { outcome: 'PAYMENT_FAILED', orderId: order.rows[0].id, userId: order.rows[0].userId };
}

async function processWebhookEvent(tx, event) {
  const razorpayPayment = event.payload && event.payload.payment && event.payload.payment.entity;
  if (!razorpayPayment) return { outcome: 'IGNORED' };

  if (event.event === 'payment.captured' || event.event === 'order.paid') {
    return applyCapturedPayment(tx, razorpayPayment.order_id, razorpayPayment.id);
  }
  if (event.event === 'payment.failed') return markPaymentFailed(tx, razorpayPayment.order_id);
  return { outcome: 'IGNORED' };
}

// Razorpay may send the same event several times. The event id is saved in the same transaction
// as the change itself, so a duplicate is skipped and a crash does not lose the event.
async function handleWebhook({ rawBody, signature, eventId }) {
  const signatureIsValid = isValidWebhookSignature({ rawBody, signature, webhookSecret: environment.razorpay.webhookSecret });
  if (!signatureIsValid) throw new AppError('Invalid webhook signature', 400, 'INVALID_SIGNATURE');

  let event;
  try {
    event = JSON.parse(rawBody.toString('utf8'));
  } catch (error) {
    throw new AppError('Webhook body is not valid JSON', 400, 'INVALID_JSON');
  }

  const uniqueEventId = eventId || crypto.createHash('sha256').update(rawBody).digest('hex');
  const result = await runInTransaction(async (tx) => {
    const saved = await tx.query('INSERT INTO payment_events (event_id) VALUES ($1) ON CONFLICT DO NOTHING', [uniqueEventId]);
    if (saved.rowCount === 0) return { outcome: 'DUPLICATE_EVENT' };
    return processWebhookEvent(tx, event);
  });
  notifyAboutOutcome(result);
  return result;
}

// Safety net for lost or delayed webhooks: ask Razorpay about payments that are still open.
async function reconcileOpenPayments() {
  const { keyId, keySecret } = environment.razorpay;
  if (!keyId || !keySecret) return 0;

  const open = await query(
    `SELECT pay.razorpay_order_id FROM payments pay JOIN orders o ON o.id = pay.order_id
     WHERE pay.status IN ($1, $2) AND o.status IN ($3, $4, $5)
       AND o.created_at < NOW() - INTERVAL '2 minutes' AND o.created_at > NOW() - INTERVAL '1 day'
     ORDER BY pay.id LIMIT 20`,
    [PAYMENT_STATUS.created, PAYMENT_STATUS.failed, ORDER_STATUS.pendingPayment, ORDER_STATUS.expired, ORDER_STATUS.cancelled]
  );

  let fixedCount = 0;
  for (const row of open.rows) {
    const razorpayPayments = await getRazorpayClient().orders.fetchPayments(row.razorpayOrderId);
    const captured = (razorpayPayments.items || []).find((item) => item.status === 'captured');
    if (!captured) continue;
    const result = await confirmPayment(row.razorpayOrderId, captured.id);
    if (result.outcome === 'PAID' || result.outcome === 'NEEDS_REFUND') fixedCount += 1;
  }
  return fixedCount;
}

module.exports = { createPaymentOrder, verifyPayment, handleWebhook, reconcileOpenPayments };
