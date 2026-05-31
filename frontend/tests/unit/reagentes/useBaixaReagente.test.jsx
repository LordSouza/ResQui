import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useBaixaReagente } from '../../../src/reagentes/useBaixaReagente';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useBaixaReagente', () => {
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

  it('sends POST /api/reagentes/:id/baixa with Quantidade body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true, status: 200,
      json: async () => ({ estoqueAtual: 3.5 }),
    });

    const { result } = renderHook(() => useBaixaReagente('R-001'), { wrapper });
    act(() => result.current.mutate({ quantidade: 0.5 }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetch.mock.calls[0][0]).toBe('/api/reagentes/R-001/baixa');
    expect(mockFetch.mock.calls[0][1].method).toBe('POST');
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({ Quantidade: 0.5 });
  });

  it('sets isError on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 422, text: async () => JSON.stringify({ message: 'Erro ao registrar baixa' }) });

    const { result } = renderHook(() => useBaixaReagente('R-001'), { wrapper });
    act(() => result.current.mutate({ quantidade: 999 }));
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error.message).toBe('Erro ao registrar baixa');
  });
});
