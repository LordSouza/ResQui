import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAtualizarResiduo } from '../../../src/residuos/useAtualizarResiduo';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useAtualizarResiduo', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      data: {},
      setItem(k, v) { this.data[k] = String(v); },
      getItem(k) { return this.data[k] ?? null; },
      removeItem(k) { delete this.data[k]; },
      clear() { this.data = {}; },
    });
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => vi.unstubAllGlobals());

  it('PUT /api/residuos/:id com campos corretos', async () => {
    fetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ id: 5, tipo: 'Metais pesados' }) });

    const { result } = renderHook(() => useAtualizarResiduo(), { wrapper });
    act(() => result.current.mutate({ id: 5, Tipo: 'Metais pesados', Volume: 0.8 }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetch.mock.calls[0][0]).toBe('/api/residuos/5');
    expect(fetch.mock.calls[0][1].method).toBe('PUT');
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.id).toBeUndefined(); // id não vai no body
    expect(body.Tipo).toBe('Metais pesados');
  });
});
