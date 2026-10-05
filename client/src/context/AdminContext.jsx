import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import adminApi from '../api/adminClient.js';

const AdminContext = createContext(null);
const ADMIN_TOKEN_KEY = 'medicheck_admin_token';

// Admin session is fully separate from the user session: own token, own
// storage key, own login flow. There is no GET /api/admin/me on the backend,
// so session restore probes with a cheap authorised call (users list,
// limit=1); a 401/403 means the token is dead and we drop it.
export function AdminProvider({ children }) {
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem(ADMIN_TOKEN_KEY));
  const [admin, setAdmin] = useState(null);
  const [initialising, setInitialising] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const t = localStorage.getItem(ADMIN_TOKEN_KEY);
      if (!t) {
        setInitialising(false);
        return;
      }
      try {
        const { data } = await adminApi.get('/api/admin/users', { params: { limit: 1 } });
        if (!cancelled) {
          setAdminToken(t);
          setAdmin({ role: 'superadmin', totalUsers: data.total });
        }
      } catch {
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        if (!cancelled) {
          setAdminToken(null);
          setAdmin(null);
        }
      } finally {
        if (!cancelled) setInitialising(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await adminApi.post('/api/admin/login', { email, password });
    localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
    setAdminToken(data.token);
    setAdmin(data.admin || { role: 'superadmin' });
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    setAdminToken(null);
    setAdmin(null);
  }, []);

  return (
    <AdminContext.Provider
      value={{
        adminToken,
        admin,
        initialising,
        isAdminAuthenticated: !!adminToken,
        login,
        logout,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used inside <AdminProvider>');
  return ctx;
}
