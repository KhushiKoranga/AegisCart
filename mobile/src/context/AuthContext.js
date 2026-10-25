import React, { createContext, useContext, useEffect, useState } from 'react';
import * as authService from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On app start, try to reuse the saved login.
  useEffect(() => {
    authService.restoreSession().then(setUser).finally(() => setLoading(false));
  }, []);

  const value = {
    user,
    loading,
    isAdmin: Boolean(user && user.role === 'ADMIN'),
    login: async (email, password) => setUser(await authService.login(email, password)),
    loginAsAdmin: async (email, password) => setUser(await authService.loginAsAdmin(email, password)),
    register: async (...details) => setUser(await authService.register(...details)),
    logout: async () => {
      await authService.logout();
      setUser(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
