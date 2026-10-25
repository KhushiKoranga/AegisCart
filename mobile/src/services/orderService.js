import { apiRequest } from './apiClient';

export const createOrder = (addressId, idempotencyKey) =>
  apiRequest('/orders', { method: 'POST', body: { addressId }, headers: { 'Idempotency-Key': idempotencyKey } });
export const listOrders = () => apiRequest('/orders');
export const getOrder = (orderId) => apiRequest(`/orders/${orderId}`);
export const cancelOrder = (orderId) => apiRequest(`/orders/${orderId}/cancel`, { method: 'POST' });

export const createPaymentOrder = (orderId) => apiRequest('/payments/create-order', { method: 'POST', body: { orderId } });
export const verifyPayment = (payment) => apiRequest('/payments/verify', { method: 'POST', body: payment });
