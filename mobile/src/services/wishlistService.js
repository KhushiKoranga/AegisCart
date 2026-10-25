import { apiRequest } from './apiClient';

export const getWishlist = () => apiRequest('/wishlist');
export const addToWishlist = (productId) => apiRequest('/wishlist', { method: 'POST', body: { productId } });
export const removeFromWishlist = (productId) => apiRequest(`/wishlist/${productId}`, { method: 'DELETE' });
