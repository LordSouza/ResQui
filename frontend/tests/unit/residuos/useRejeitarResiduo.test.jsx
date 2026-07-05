import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRejeitarResiduo } from '../../../src/residuos/useRejeitarResiduo';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useRejeitarResiduo', () => {
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

  it('PUT /api/residuos/:id/rejeitar com motivo no corpo', async () => {
    fetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ id: 7, status: 'rejeitado' }) });

    const { result } = renderHook(() => useRejeitarResiduo(), { wrapper });
    act(() => result.current.mutate({ id: 7, motivo: 'fora de conformidade' }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetch.mock.calls[0][0]).toBe('/api/residuos/7/rejeitar');
    expect(fetch.mock.calls[0][1].method).toBe('PUT');
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ Motivo: 'fora de conformidade' });
  });

  it('envia Motivo null quando omitido', async () => {
    fetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ id: 7, status: 'rejeitado' }) });

    const { result } = renderHook(() => useRejeitarResiduo(), { wrapper });
    act(() => result.current.mutate({ id: 7 }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ Motivo: null });
  });
});
