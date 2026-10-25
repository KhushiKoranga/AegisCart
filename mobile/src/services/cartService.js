import { apiRequest } from './apiClient';

export const getCart = () => apiRequest('/cart');
export const addToCart = (variantId, quantity = 1) => apiRequest('/cart/items', { method: 'POST', body: { variantId, quantity } });
export const updateCartItem = (cartItemId, quantity) => apiRequest(`/cart/items/${cartItemId}`, { method: 'PATCH', body: { quantity } });
export const removeCartItem = (cartItemId) => apiRequest(`/cart/items/${cartItemId}`, { method: 'DELETE' });
