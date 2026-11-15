import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

const TOKEN_KEY = 'resqui_token';

function parseJwtPayload(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [sessaoExpirada, setSessaoExpirada] = useState(false);
  const queryClient = useQueryClient();

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

  // O cache do React Query é por aba, não por usuário: sem limpar, quem entra depois vê dados do anterior.
  const login = useCallback((tokenStr, userDto) => {
    queryClient.clear();
    localStorage.setItem(TOKEN_KEY, tokenStr);
    setToken(tokenStr);
    setUser(userDto);
    setSessaoExpirada(false);
  }, [queryClient]);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  const updateUser = useCallback((profile) => setUser(profile), []);

  useEffect(() => {
    const encerrarSessaoExpirada = () => {
      logout();
      setSessaoExpirada(true);
    };
    window.addEventListener('auth:unauthorized', encerrarSessaoExpirada);
    return () => window.removeEventListener('auth:unauthorized', encerrarSessaoExpirada);
  }, [logout]);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser, sessaoExpirada }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
