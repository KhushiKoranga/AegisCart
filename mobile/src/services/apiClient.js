// Every request to the backend goes through this file.
// It adds the login token and refreshes it automatically when it expires.
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../constants/theme';

const ACCESS_KEY = 'aegis_access_token';
const REFRESH_KEY = 'aegis_refresh_token';

let accessToken = null;
let refreshToken = null;
let refreshInProgress = null;

export function getAccessToken() {
  return accessToken;
}

export async function saveTokens(tokens) {
  accessToken = tokens.accessToken;
  refreshToken = tokens.refreshToken;
  await SecureStore.setItemAsync(ACCESS_KEY, accessToken);
  await SecureStore.setItemAsync(REFRESH_KEY, refreshToken);
}

export async function loadTokens() {
  accessToken = await SecureStore.getItemAsync(ACCESS_KEY);
  refreshToken = await SecureStore.getItemAsync(REFRESH_KEY);
  return Boolean(accessToken && refreshToken);
}

export async function clearTokens() {
  accessToken = null;
  refreshToken = null;
  await SecureStore.deleteItemAsync(ACCESS_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
}

export function getRefreshToken() {
  return refreshToken;
}

async function sendRequest(path, { method = 'GET', body, headers = {}, isFormData = false, auth = true }) {
  const requestHeaders = { ...headers };
  if (body && !isFormData) requestHeaders['Content-Type'] = 'application/json';
  if (auth && accessToken) requestHeaders.Authorization = `Bearer ${accessToken}`;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: requestHeaders,
    body: body && !isFormData ? JSON.stringify(body) : body,
  });
  const json = await response.json().catch(() => null);
  return { response, json };
}

// Only one refresh runs at a time, even if several requests expire together.
async function refreshSession() {
  if (!refreshToken) return false;
  if (!refreshInProgress) {
    refreshInProgress = sendRequest('/auth/refresh', { method: 'POST', body: { refreshToken }, auth: false })
      .then(async ({ response, json }) => {
        if (!response.ok) return false;
        await saveTokens(json.data);
        return true;
      })
      .catch(() => false)
      .finally(() => { refreshInProgress = null; });
  }
  return refreshInProgress;
}

export async function apiRequest(path, options = {}) {
  let result;
  try {
    result = await sendRequest(path, options);
    if (result.response.status === 401 && result.json && result.json.code === 'TOKEN_EXPIRED') {
      const refreshed = await refreshSession();
      if (refreshed) result = await sendRequest(path, options);
    }
  } catch (error) {
    throw new Error('Cannot reach the server. Check your internet connection and the API address.');
  }

  if (!result.response.ok) {
    const error = new Error((result.json && result.json.message) || 'Something went wrong');
    error.status = result.response.status;
    error.code = result.json && result.json.code;
    throw error;
  }
  return result.json.data;
}
