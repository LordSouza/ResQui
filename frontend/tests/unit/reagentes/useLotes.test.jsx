import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useLotes } from '../../../src/reagentes/useLotes';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useLotes', () => {
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

  it('fetches GET /api/reagentes/:id/lotes and returns the list', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true, status: 200,
      json: async () => ([{ id: 1, codigo: 'L-A', estoque: 1.5, validade: '2027-01-01', validadeStatus: 'ok' }]),
    });

    const { result } = renderHook(() => useLotes('R-001'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetch.mock.calls[0][0]).toBe('/api/reagentes/R-001/lotes');
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data[0].codigo).toBe('L-A');
  });

  it('returns [] when the API responds with a non-array body', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => null });

    const { result } = renderHook(() => useLotes('R-001'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([]);
  });

  it('does not fetch when reagenteId is falsy', async () => {
    renderHook(() => useLotes(null), { wrapper });
    await new Promise(r => setTimeout(r, 50));
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
