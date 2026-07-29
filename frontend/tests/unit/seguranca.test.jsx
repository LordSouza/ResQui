import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useAlterarSenha, useSetup2fa, useAtivar2fa,
  useSessoes, useRevogarSessao, useRevogarOutrasSessoes,
} from '../../src/auth/useSeguranca';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('hooks de segurança', () => {
  let mockFetch;

  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      data: {},
      setItem(k, v) { this.data[k] = String(v); },
      getItem(k) { return this.data[k] ?? null; },
      removeItem(k) { delete this.data[k]; },
      clear() { this.data = {}; },
    });
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('useAlterarSenha sends POST /api/auth/alterar-senha', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 204 });
    const { result } = renderHook(() => useAlterarSenha(), { wrapper });
    act(() => result.current.mutate({ senhaAtual: 'a', novaSenha: 'NovaSenha@1' }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch.mock.calls[0][0]).toBe('/api/auth/alterar-senha');
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({ SenhaAtual: 'a', NovaSenha: 'NovaSenha@1' });
  });

  it('useSetup2fa sends the current password and returns secret + otpauthUri', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ secret: 'ABC', otpauthUri: 'otpauth://totp/ResQui' }) });
    const { result } = renderHook(() => useSetup2fa(), { wrapper });
    act(() => result.current.mutate('senha123'));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch.mock.calls[0][0]).toBe('/api/auth/2fa/setup');
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({ Senha: 'senha123' });
    expect(result.current.data.secret).toBe('ABC');
  });

  it('useAtivar2fa sends the code as Codigo and returns the recovery codes', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ codigos: ['aaaa-1111', 'bbbb-2222'] }) });
    const { result } = renderHook(() => useAtivar2fa(), { wrapper });
    act(() => result.current.mutate('123456'));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch.mock.calls[0][0]).toBe('/api/auth/2fa/ativar');
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({ Codigo: '123456' });
    expect(result.current.data.codigos).toEqual(['aaaa-1111', 'bbbb-2222']);
  });

  it('useSessoes returns the list', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ([{ jti: 'x', atual: true }]) });
    const { result } = renderHook(() => useSessoes(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
  });

  it('useRevogarSessao sends DELETE with the jti', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 204 });
    const { result } = renderHook(() => useRevogarSessao(), { wrapper });
    act(() => result.current.mutate('jti-123'));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch.mock.calls[0][0]).toBe('/api/auth/sessoes/jti-123');
    expect(mockFetch.mock.calls[0][1].method).toBe('DELETE');
  });

  it('useRevogarOutrasSessoes posts to revogar-outras', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ revogadas: 2 }) });
    const { result } = renderHook(() => useRevogarOutrasSessoes(), { wrapper });
    act(() => result.current.mutate());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch.mock.calls[0][0]).toBe('/api/auth/sessoes/revogar-outras');
    expect(result.current.data.revogadas).toBe(2);
  });
});
