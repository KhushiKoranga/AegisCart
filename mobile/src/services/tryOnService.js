import { apiRequest } from './apiClient';

// The photo is sent as multipart form data. "consentGiven" records that the customer agreed.
export function uploadPhoto(photoUri) {
  const form = new FormData();
  form.append('photo', { uri: photoUri, name: 'photo.jpg', type: 'image/jpeg' });
  form.append('consentGiven', 'true');
  return apiRequest('/virtual-try-on/photos', { method: 'POST', body: form, isFormData: true });
}

export const deletePhoto = (photoId) => apiRequest(`/virtual-try-on/photos/${photoId}`, { method: 'DELETE' });
export const createTryOn = (photoId, productId, variantId) =>
  apiRequest('/virtual-try-on', { method: 'POST', body: { photoId, productId, variantId } });
export const getTryOn = (tryOnId) => apiRequest(`/virtual-try-on/${tryOnId}`);
export const listHistory = () => apiRequest('/virtual-try-on/history');
export const listSaved = () => apiRequest('/virtual-try-on/saved');
export const saveTryOn = (tryOnId) => apiRequest(`/virtual-try-on/${tryOnId}/save`, { method: 'POST' });
export const unsaveTryOn = (tryOnId) => apiRequest(`/virtual-try-on/${tryOnId}/save`, { method: 'DELETE' });
export const deleteTryOn = (tryOnId) => apiRequest(`/virtual-try-on/${tryOnId}`, { method: 'DELETE' });
