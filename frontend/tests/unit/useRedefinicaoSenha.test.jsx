import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSolicitarRedefinicao, useRedefinirSenha } from '../../src/auth/useRedefinicaoSenha';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useRedefinicaoSenha', () => {
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

  it('useSolicitarRedefinicao envia o e-mail para POST /api/auth/esqueci-senha', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 204 });
    const { result } = renderHook(() => useSolicitarRedefinicao(), { wrapper });

    act(() => result.current.mutate('ana@lab.com'));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch.mock.calls[0][0]).toBe('/api/auth/esqueci-senha');
    expect(mockFetch.mock.calls[0][1].method).toBe('POST');
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({ Email: 'ana@lab.com' });
  });

  it('useSolicitarRedefinicao expõe a mensagem do 503', async () => {
    mockFetch.mockResolvedValue({
      ok: false, status: 503,
      text: async () => JSON.stringify({ message: 'A recuperação de senha por e-mail não está configurada nesta instalação.' }),
    });
    const { result } = renderHook(() => useSolicitarRedefinicao(), { wrapper });

    act(() => result.current.mutate('ana@lab.com'));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error.message).toMatch(/não está configurada/);
  });

  it('useRedefinirSenha envia token e nova senha para POST /api/auth/redefinir-senha', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 204 });
    const { result } = renderHook(() => useRedefinirSenha(), { wrapper });

    act(() => result.current.mutate({ token: 'tok-1', novaSenha: 'Nova@Senha1' }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch.mock.calls[0][0]).toBe('/api/auth/redefinir-senha');
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({ Token: 'tok-1', NovaSenha: 'Nova@Senha1' });
  });
});
