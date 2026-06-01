import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRemoverCompatOverride } from '../../../src/compat/useRemoverCompatOverride';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useRemoverCompatOverride', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      data: {}, setItem(k, v) { this.data[k] = String(v); },
      getItem(k) { return this.data[k] ?? null; },
      removeItem(k) { delete this.data[k]; },
      clear() { this.data = {}; },
    });
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => vi.unstubAllGlobals());

  it('envia DELETE /api/compat/overrides/{a}/{b}', async () => {
    fetch.mockResolvedValueOnce({ ok: true, status: 204, json: async () => null });
    const { result } = renderHook(() => useRemoverCompatOverride(), { wrapper });
    act(() => result.current.mutate({ classeA: 1, classeB: 3 }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetch.mock.calls[0][0]).toBe('/api/compat/overrides/1/3');
    expect(fetch.mock.calls[0][1].method).toBe('DELETE');
  });

  it('seta isError em resposta não-ok', async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 404, text: async () => JSON.stringify({ message: 'Override não encontrado' }) });
    const { result } = renderHook(() => useRemoverCompatOverride(), { wrapper });
    act(() => result.current.mutate({ classeA: 99, classeB: 99 }));
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
