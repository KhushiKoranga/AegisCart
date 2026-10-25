import { apiRequest } from './apiClient';
import { buildQueryString } from '../utils/format';

export const getDashboard = () => apiRequest('/admin/dashboard');
export const getSalesReport = (days = 30) => apiRequest(`/admin/reports/sales?days=${days}`);

export const listCategories = () => apiRequest('/admin/categories');
export const createCategory = (name) => apiRequest('/admin/categories', { method: 'POST', body: { name } });
export const deleteCategory = (id) => apiRequest(`/admin/categories/${id}`, { method: 'DELETE' });

export const listProducts = () => apiRequest('/admin/products?limit=50');
export const getProduct = (id) => apiRequest(`/admin/products/${id}`);
export const createProduct = (product) => apiRequest('/admin/products', { method: 'POST', body: product });
export const updateProduct = (id, product) => apiRequest(`/admin/products/${id}`, { method: 'PUT', body: product });
export const setProductActive = (id, isActive) => apiRequest(`/admin/products/${id}/availability`, { method: 'PATCH', body: { isActive } });
export const deleteProduct = (id) => apiRequest(`/admin/products/${id}`, { method: 'DELETE' });
export const addProductImage = (id, imageUrl) => apiRequest(`/admin/products/${id}/images`, { method: 'POST', body: { imageUrl } });
export const deleteProductImage = (imageId) => apiRequest(`/admin/product-images/${imageId}`, { method: 'DELETE' });

export const listVariants = (productId) => apiRequest(`/admin/products/${productId}/variants`);
export const addVariant = (productId, variant) => apiRequest(`/admin/products/${productId}/variants`, { method: 'POST', body: variant });
export const deleteVariant = (variantId) => apiRequest(`/admin/variants/${variantId}`, { method: 'DELETE' });
export const setStock = (variantId, stockQuantity) => apiRequest(`/admin/variants/${variantId}/stock`, { method: 'PATCH', body: { stockQuantity } });
export const listInventoryLogs = () => apiRequest('/admin/inventory-logs');

export const listOrders = (status) => apiRequest(`/admin/orders${buildQueryString({ status })}`);
export const updateOrderStatus = (orderId, status) => apiRequest(`/admin/orders/${orderId}/status`, { method: 'PATCH', body: { status } });

export const listFlashSales = () => apiRequest('/admin/flash-sales');
export const createFlashSale = (sale) => apiRequest('/admin/flash-sales', { method: 'POST', body: sale });
export const setFlashSaleActive = (id, isActive) => apiRequest(`/admin/flash-sales/${id}`, { method: 'PATCH', body: { isActive } });
export const deleteFlashSale = (id) => apiRequest(`/admin/flash-sales/${id}`, { method: 'DELETE' });
