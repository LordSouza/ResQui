import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCriarConvite } from '../../../src/convites/useCriarConvite';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useCriarConvite', () => {
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

  it('envia POST /api/convites com o papel e devolve o token', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ token: 'tok-1', papel: 'Aluno' }) });
    const { result } = renderHook(() => useCriarConvite(), { wrapper });

    act(() => result.current.mutate({ Papel: 'Aluno' }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetch.mock.calls[0][0]).toBe('/api/convites');
    expect(mockFetch.mock.calls[0][1].method).toBe('POST');
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({ Papel: 'Aluno' });
    expect(result.current.data.token).toBe('tok-1');
  });

  it('seta isError com a mensagem do servidor', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 400, text: async () => JSON.stringify({ message: 'Convidar Professor é só o Admin; você pode convidar Aluno.' }) });
    const { result } = renderHook(() => useCriarConvite(), { wrapper });

    act(() => result.current.mutate({ Papel: 'Professor' }));
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error.message).toMatch(/só o Admin/);
  });
});
