import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAceitarConvite } from '../../../src/convites/useAceitarConvite';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useAceitarConvite', () => {
  let mockFetch;
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      data: {}, setItem(k, v) { this.data[k] = String(v); },
      getItem(k) { return this.data[k] ?? null; },
      removeItem(k) { delete this.data[k]; },
      clear() { this.data = {}; },
    });
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('envia POST no token do convite sem repetir o token no corpo', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 204, json: async () => null });
    const { result } = renderHook(() => useAceitarConvite(), { wrapper });

    act(() => result.current.mutate({
      token: 'tok-1', Nome: 'Ana', Email: 'ana@lab.com', Matricula: null, Senha: 'Senha@123',
    }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetch.mock.calls[0][0]).toBe('/api/convites/tok-1/aceitar');
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({
      Nome: 'Ana', Email: 'ana@lab.com', Matricula: null, Senha: 'Senha@123',
    });
  });

  it('propaga a mensagem de política de senha do servidor', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 400, text: async () => JSON.stringify({ message: 'Passwords must have at least one digit.' }) });
    const { result } = renderHook(() => useAceitarConvite(), { wrapper });

    act(() => result.current.mutate({ token: 'tok-1', Nome: 'Ana', Email: 'ana@lab.com', Senha: 'senha' }));
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error.message).toMatch(/at least one digit/);
  });
});
