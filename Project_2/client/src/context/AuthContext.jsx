import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router';
import { api, setUnauthorizedHandler } from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // True until the first /auth/me round trip finishes, so pages don't flash the signed-out state.
  const [loading, setLoading] = useState(true);
  // Set when the visitor deliberately signs out or deletes their account, as opposed to a session
  // expiring. <RequireAuth> uses it to send them home rather than back to the sign-in form.
  const [signedOut, setSignedOut] = useState(false);
  const { key: locationKey } = useLocation();

  // The flag only matters on the page the visitor signed out from; clear it once they move elsewhere.
  useEffect(() => {
    setSignedOut(false);
  }, [locationKey]);

  useEffect(() => {
    let cancelled = false;
    api
      .get('/auth/me')
      .then((data) => {
        if (!cancelled) setUser(data.user);
      })
      .catch(() => {
        // Treated as signed out; pages that need the API report their own errors.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    setUnauthorizedHandler(() => setUser(null));
    return () => {
      cancelled = true;
      setUnauthorizedHandler(null);
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      signedOut,
      async login(credentials) {
        const data = await api.post('/auth/login', credentials);
        setSignedOut(false);
        setUser(data.user);
        return data.user;
      },
      async register(details) {
        const data = await api.post('/auth/register', details);
        setSignedOut(false);
        setUser(data.user);
        return data.user;
      },
      async logout() {
        await api.post('/auth/logout');
        setSignedOut(true);
        setUser(null);
      },
      async updateProfile(changes) {
        const data = await api.patch('/auth/me', changes);
        setUser(data.user);
      },
      changePassword: (passwords) => api.post('/auth/password', passwords),
      async deleteAccount(password) {
        await api.delete('/auth/me', { password });
        setSignedOut(true);
        setUser(null);
      },
    }),
    [user, loading, signedOut],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
