import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMovimentacoes } from '../../../src/reagentes/useMovimentacoes';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useMovimentacoes', () => {
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

  it('fetches movimentações with the limite param', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true, status: 200,
      json: async () => ([{ id: 'g1', what: 'reagente.baixa', detail: 'x', who: 'ana', risk: 'medium', timestamp: '2026-01-01T10:00:00Z' }]),
    });
    const { result } = renderHook(() => useMovimentacoes('R-001'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch.mock.calls[0][0]).toBe('/api/reagentes/R-001/movimentacoes?limite=20');
    expect(result.current.data[0].what).toBe('reagente.baixa');
  });

  it('does not fetch when id is falsy', async () => {
    renderHook(() => useMovimentacoes(null), { wrapper });
    await new Promise(r => setTimeout(r, 50));
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
