export function formatPrice(amount) {
  return `₹${Number(amount || 0).toFixed(2)}`;
}

export function formatDate(value) {
  return new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

// Turns { a: 1, b: undefined } into "?a=1"
export function buildQueryString(params) {
  const pairs = Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '');
  if (pairs.length === 0) return '';
  return `?${pairs.map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('&')}`;
}

// A random key that identifies one checkout attempt (used as the Idempotency-Key header).
export function createIdempotencyKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export function orderStatusLabel(status) {
  const labels = {
    PENDING_PAYMENT: 'Waiting for payment', CONFIRMED: 'Confirmed', SHIPPED: 'Shipped',
    DELIVERED: 'Delivered', CANCELLED: 'Cancelled', EXPIRED: 'Expired',
  };
  return labels[status] || status;
}
