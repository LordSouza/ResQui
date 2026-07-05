import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAprovarResiduo } from '../../../src/residuos/useAprovarResiduo';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useAprovarResiduo', () => {
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

  it('PUT /api/residuos/:id/aprovar e isSuccess', async () => {
    fetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ id: 7, status: 'aguardando-coleta' }) });

    const { result } = renderHook(() => useAprovarResiduo(), { wrapper });
    act(() => result.current.mutate(7));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetch.mock.calls[0][0]).toBe('/api/residuos/7/aprovar');
    expect(fetch.mock.calls[0][1].method).toBe('PUT');
  });

  it('isError em resposta não-ok', async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 403, text: async () => JSON.stringify({ message: 'Erro ao aprovar descarte' }) });

    const { result } = renderHook(() => useAprovarResiduo(), { wrapper });
    act(() => result.current.mutate(7));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error.message).toBe('Erro ao aprovar descarte');
  });
});
