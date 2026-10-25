const ROLES = { customer: 'CUSTOMER', admin: 'ADMIN' };

const ORDER_STATUS = {
  pendingPayment: 'PENDING_PAYMENT',
  confirmed: 'CONFIRMED', // paid
  shipped: 'SHIPPED',
  delivered: 'DELIVERED',
  cancelled: 'CANCELLED',
  expired: 'EXPIRED',
};

const PAYMENT_STATUS = {
  created: 'CREATED',
  paid: 'PAID',
  failed: 'FAILED',
  needsRefund: 'NEEDS_REFUND',
};

const TRYON_STATUS = {
  pending: 'pending',
  processing: 'processing',
  completed: 'completed',
  failed: 'failed',
};

const MAX_QUANTITY_PER_ITEM = 10;

module.exports = { ROLES, ORDER_STATUS, PAYMENT_STATUS, TRYON_STATUS, MAX_QUANTITY_PER_ITEM };
