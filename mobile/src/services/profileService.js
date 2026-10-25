import { apiRequest } from './apiClient';

export const getProfile = () => apiRequest('/profile');
export const updateProfile = (name, phone) => apiRequest('/profile', { method: 'PUT', body: { name, phone } });
export const savePushToken = (fcmToken) => apiRequest('/profile/push-token', { method: 'PUT', body: { fcmToken } });

export const listAddresses = () => apiRequest('/addresses');
export const addAddress = (address) => apiRequest('/addresses', { method: 'POST', body: address });
export const deleteAddress = (addressId) => apiRequest(`/addresses/${addressId}`, { method: 'DELETE' });

export const listNotifications = () => apiRequest('/notifications');
export const markNotificationsRead = () => apiRequest('/notifications/read', { method: 'POST' });
