import { apiRequest } from './apiClient';
import { buildQueryString } from '../utils/format';

export const listProducts = (filters = {}) => apiRequest(`/products${buildQueryString(filters)}`, { auth: false });
export const getProduct = (productId) => apiRequest(`/products/${productId}`, { auth: false });
export const listCategories = () => apiRequest('/categories', { auth: false });
