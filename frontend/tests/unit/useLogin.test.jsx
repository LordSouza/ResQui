import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../../src/auth/AuthContext';
import { useLogin } from '../../src/auth/useLogin';

function makeToken(payload) {
  return `h.${btoa(JSON.stringify(payload))}.s`;
}

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}

describe('useLogin', () => {
  let mockFetch;

  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      data: {},
      setItem(key, value) { this.data[key] = String(value); },
      getItem(key) { return this.data[key] ?? null; },
      removeItem(key) { delete this.data[key]; },
      clear() { this.data = {}; },
    });
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('on success stores token in localStorage and sets isSuccess', async () => {
    const token = makeToken({ sub: 'u1', email: 'admin@test.com', papel: 'Admin', exp: 9999999999 });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ token, expireAt: '2099-01-01T00:00:00Z', user: { id: 'u1', email: 'admin@test.com', papel: 'Admin', roles: ['Admin'] } }),
    });

    const { result } = renderHook(() => useLogin(), { wrapper });
    result.current.mutate({ email: 'admin@test.com', senha: 'Admin@123' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(localStorage.getItem('resqui_token')).toBe(token);
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/auth/login',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('on 401 (wrong password) sets isError and does NOT store token', async () => {
    mockFetch.mockResolvedValueOnce({ status: 401, ok: false });

    const { result } = renderHook(() => useLogin(), { wrapper });
    result.current.mutate({ email: 'x@x.com', senha: 'errada' });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(localStorage.getItem('resqui_token')).toBeNull();
  });

  it('sends Email and Senha fields in POST body', async () => {
    const token = makeToken({ sub: 'u1', email: 'a@b.com', papel: 'Admin', exp: 9999999999 });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ token, expireAt: '2099-01-01T00:00:00Z', user: { id: 'u1', email: 'a@b.com', papel: 'Admin', roles: ['Admin'] } }),
    });

    const { result } = renderHook(() => useLogin(), { wrapper });
    result.current.mutate({ email: 'a@b.com', senha: 'Senha@123' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body).toEqual({ Email: 'a@b.com', Senha: 'Senha@123' });
  });
});
