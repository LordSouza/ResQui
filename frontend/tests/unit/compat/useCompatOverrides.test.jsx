import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCompatOverrides } from '../../../src/compat/useCompatOverrides';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useCompatOverrides', () => {
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

  it('fetches GET /api/compat/overrides', async () => {
    fetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => [] });
    const { result } = renderHook(() => useCompatOverrides(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetch.mock.calls[0][0]).toBe('/api/compat/overrides');
    expect(result.current.data).toEqual([]);
  });

  it('retorna overrides com campos do servidor', async () => {
    fetch.mockResolvedValueOnce({
      ok: true, status: 200,
      json: async () => [{ classeA: 1, classeB: 3, nivel: 3, motivo: 'Risco alto', autor: 'Ana', dataEdicao: '2024-08-12' }],
    });
    const { result } = renderHook(() => useCompatOverrides(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data[0].classeA).toBe(1);
    expect(result.current.data[0].nivel).toBe(3);
    expect(result.current.data[0].motivo).toBe('Risco alto');
  });

  it('seta isError em resposta não-ok', async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 500, text: async () => JSON.stringify({ message: 'Erro' }) });
    const { result } = renderHook(() => useCompatOverrides(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
