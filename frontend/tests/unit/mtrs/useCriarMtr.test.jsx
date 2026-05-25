import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCriarMtr } from '../../../src/mtrs/useCriarMtr';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useCriarMtr', () => {
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

  it('POST /api/mtrs com cmd correto', async () => {
    fetch.mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({ id: 1 }) });

    const { result } = renderHook(() => useCriarMtr(), { wrapper });
    const cmd = { Gerador: 'Unifei', Transportadora: 'EcoLog', Destinador: 'EcoQ', CodigoIbama: 'A099', ResiduoIds: [1, 2] };

    act(() => result.current.mutate(cmd));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetch.mock.calls[0][0]).toBe('/api/mtrs');
    expect(fetch.mock.calls[0][1].method).toBe('POST');
    expect(JSON.parse(fetch.mock.calls[0][1].body).ResiduoIds).toEqual([1, 2]);
  });
});
