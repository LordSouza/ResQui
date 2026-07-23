import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';

const TOKEN_KEY = 'resqui_token';

function parseJwtPayload(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) return;
    const payload = parseJwtPayload(stored);
    if (!payload || payload.exp <= Date.now() / 1000) {
      localStorage.removeItem(TOKEN_KEY);
      return;
    }
    setToken(stored);
    setUser({ id: payload.sub, email: payload.email, papel: payload.papel });

    // hidrata o perfil completo (nome, matrícula, roles, 2FA) — o JWT só traz id/email/papel
    let cancelled = false;
    apiFetch('/api/auth/me')
      .then(res => res.json())
      .then(profile => { if (!cancelled) setUser(profile); })
      .catch(() => { /* offline/erro não-401: mantém o básico do JWT */ });
    return () => { cancelled = true; };
  }, []);

  const login = useCallback((tokenStr, userDto) => {
    localStorage.setItem(TOKEN_KEY, tokenStr);
    setToken(tokenStr);
    setUser(userDto);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    window.addEventListener('auth:unauthorized', logout);
    return () => window.removeEventListener('auth:unauthorized', logout);
  }, [logout]);

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
