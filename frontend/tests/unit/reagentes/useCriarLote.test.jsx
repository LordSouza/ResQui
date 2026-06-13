import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCriarLote } from '../../../src/reagentes/useCriarLote';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useCriarLote', () => {
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

  it('sends POST /api/reagentes/:id/lotes with the lote payload', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true, status: 201,
      json: async () => ({ id: 7, codigo: 'L-X', estoque: 2 }),
    });

    const { result } = renderHook(() => useCriarLote('R-001'), { wrapper });
    act(() => result.current.mutate({ Codigo: 'L-X', Estoque: 2, Validade: '2027-06-01', Abertura: null }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetch.mock.calls[0][0]).toBe('/api/reagentes/R-001/lotes');
    expect(mockFetch.mock.calls[0][1].method).toBe('POST');
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({ Codigo: 'L-X', Estoque: 2, Validade: '2027-06-01', Abertura: null });
  });

  it('sets isError with the server message on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 400, text: async () => JSON.stringify({ message: 'Código do lote é obrigatório.' }) });

    const { result } = renderHook(() => useCriarLote('R-001'), { wrapper });
    act(() => result.current.mutate({ Codigo: '', Estoque: 2, Validade: '2027-06-01' }));
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error.message).toBe('Código do lote é obrigatório.');
  });
});
