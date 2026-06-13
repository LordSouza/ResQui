import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useBaixaLote } from '../../../src/reagentes/useBaixaLote';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useBaixaLote', () => {
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

  it('sends POST /api/reagentes/:id/lotes/:loteId/baixa with Quantidade body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true, status: 200,
      json: async () => ({ id: 3, estoque: 0.5 }),
    });

    const { result } = renderHook(() => useBaixaLote('R-001'), { wrapper });
    act(() => result.current.mutate({ loteId: 3, quantidade: 1 }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetch.mock.calls[0][0]).toBe('/api/reagentes/R-001/lotes/3/baixa');
    expect(mockFetch.mock.calls[0][1].method).toBe('POST');
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({ Quantidade: 1 });
  });

  it('sets isError with the server message when stock is insufficient', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 400, text: async () => JSON.stringify({ message: 'Estoque insuficiente no lote L-A: disponível 0.5, solicitado 2.' }) });

    const { result } = renderHook(() => useBaixaLote('R-001'), { wrapper });
    act(() => result.current.mutate({ loteId: 3, quantidade: 2 }));
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error.message).toMatch(/Estoque insuficiente/);
  });
});
