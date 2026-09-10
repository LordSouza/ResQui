import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../src/auth/AuthContext';

// Gera um JWT fake com payload arbitrário
function makeToken(payload) {
  return `header.${btoa(JSON.stringify(payload))}.sig`;
}

const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

describe('AuthContext', () => {
  let mockFetch;
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      data: {},
      setItem(key, value) { this.data[key] = String(value); },
      getItem(key) { return this.data[key] ?? null; },
      removeItem(key) { delete this.data[key]; },
      clear() { this.data = {}; },
    });
    mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('initializes with null user and token when localStorage is empty', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
  });

  it('hidrata o user completo via /api/auth/me no mount com token válido', async () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = makeToken({ sub: 'u1', email: 'admin@test.com', papel: 'Professor', exp });
    localStorage.setItem('resqui_token', token);
    const profile = { id: 'u1', email: 'admin@test.com', nome: 'Admin Real', matricula: '123', papel: 'Professor', roles: ['Professor'], twoFactorEnabled: true };
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => profile });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.user).toEqual(profile));
    expect(result.current.token).toBe(token);
  });

  it('mantém o user básico do JWT quando /api/auth/me falha (offline)', async () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = makeToken({ sub: 'u1', email: 'admin@test.com', papel: 'Professor', exp });
    localStorage.setItem('resqui_token', token);
    mockFetch.mockRejectedValueOnce(new Error('offline'));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.user).toEqual({ id: 'u1', email: 'admin@test.com', papel: 'Professor' }));
    expect(result.current.token).toBe(token);
  });

  it('discards expired token from localStorage on mount', () => {
    const exp = Math.floor(Date.now() / 1000) - 100;
    const token = makeToken({ sub: 'u1', email: 'admin@test.com', papel: 'Professor', exp });
    localStorage.setItem('resqui_token', token);

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.user).toBeNull();
    expect(localStorage.getItem('resqui_token')).toBeNull();
  });

  it('login() saves token to localStorage and sets user in state', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    const token = 'fake-token';
    const user = { id: 'u1', email: 'a@b.com', papel: 'Professor' };

    act(() => {
      result.current.login(token, user);
    });

    expect(result.current.token).toBe(token);
    expect(result.current.user).toEqual(user);
    expect(localStorage.getItem('resqui_token')).toBe(token);
  });

  it('logout() removes token from localStorage and clears state', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => {
      result.current.login('some-token', { id: 'u1', email: 'a@b.com', papel: 'Professor' });
    });
    act(() => {
      result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(localStorage.getItem('resqui_token')).toBeNull();
  });

  it('calls logout when auth:unauthorized event fires', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => {
      result.current.login('some-token', { id: 'u1', email: 'a@b.com', papel: 'Professor' });
    });

    act(() => {
      window.dispatchEvent(new Event('auth:unauthorized'));
    });

    expect(result.current.user).toBeNull();
    expect(localStorage.getItem('resqui_token')).toBeNull();
  });

  it('useAuth throws when used outside AuthProvider', () => {
    expect(() => renderHook(() => useAuth())).toThrow('useAuth must be used within AuthProvider');
  });
});
