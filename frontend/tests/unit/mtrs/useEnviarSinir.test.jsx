import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEnviarSinir } from '../../../src/mtrs/useEnviarSinir';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useEnviarSinir', () => {
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

  it('PUT /api/mtrs/:id/enviar-sinir', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ sucesso: true, mensagem: 'Aceito pelo SINIR', novoStatus: 'AceitoSinir' }) });

    const { result } = renderHook(() => useEnviarSinir(), { wrapper });
    act(() => result.current.mutate(3));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetch.mock.calls[0][0]).toBe('/api/mtrs/3/enviar-sinir');
    expect(fetch.mock.calls[0][1].method).toBe('PUT');
  });
});
