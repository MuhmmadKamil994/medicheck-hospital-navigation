import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api, { parseApiError } from '../api/client.js';

const AuthContext = createContext(null);

const TOKEN_KEY = 'medicheck_token';

/**
 * Holds the logged-in user + JWT.
 * - On mount: if a token exists, fetch /api/auth/me to restore the session.
 * - login/register store the token and user; logout clears both.
 * - Errors are thrown as { message, errors, status } (see parseApiError).
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [initialising, setInitialising] = useState(true);

  const saveSession = (newToken, newUser) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const login = async (email, password) => {
    try {
      const { data } = await api.post('/api/auth/login', { email, password });
      saveSession(data.token, data.user);
      return data.user;
    } catch (err) {
      throw parseApiError(err, 'Login failed. Please try again.');
    }
  };

  const register = async (payload) => {
    try {
      const { data } = await api.post('/api/auth/register', payload);
      saveSession(data.token, data.user);
      return data.user;
    } catch (err) {
      throw parseApiError(err, 'Registration failed. Please try again.');
    }
  };

  // Restore session on first load.
  useEffect(() => {
    (async () => {
      if (!token) {
        setInitialising(false);
        return;
      }
      try {
        const { data } = await api.get('/api/auth/me');
        setUser(data.user);
      } catch {
        // Token invalid/expired (or server unreachable) — drop it silently.
        logout();
      } finally {
        setInitialising(false);
      }
    })();
  }, [token, logout]);

  return (
    <AuthContext.Provider
      value={{ user, token, initialising, isAuthenticated: !!user, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
