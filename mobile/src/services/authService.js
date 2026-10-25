import { apiRequest, saveTokens, loadTokens, clearTokens, getRefreshToken } from './apiClient';

async function startSession(session) {
  await saveTokens(session);
  return session.user;
}

export async function login(email, password) {
  return startSession(await apiRequest('/auth/login', { method: 'POST', body: { email, password }, auth: false }));
}

export async function loginAsAdmin(email, password) {
  return startSession(await apiRequest('/auth/admin/login', { method: 'POST', body: { email, password }, auth: false }));
}

export async function register(name, email, password, phone) {
  return startSession(await apiRequest('/auth/register', { method: 'POST', body: { name, email, password, phone }, auth: false }));
}

// Returns the logged-in user if a saved session still works, otherwise null.
export async function restoreSession() {
  if (!(await loadTokens())) return null;
  try {
    return await apiRequest('/profile');
  } catch (error) {
    await clearTokens();
    return null;
  }
}

export async function logout() {
  const refreshToken = getRefreshToken();
  try {
    if (refreshToken) await apiRequest('/auth/logout', { method: 'POST', body: { refreshToken }, auth: false });
  } finally {
    await clearTokens();
  }
}
