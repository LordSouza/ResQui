import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAprovarResiduos } from '../../../src/residuos/useAprovarResiduos';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const ok = { ok: true, status: 200, json: async () => ({}) };
const recusado = (message) => ({ ok: false, status: 400, text: async () => JSON.stringify({ message }) });

describe('useAprovarResiduos', () => {
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

  it('faz um PUT /api/residuos/:id/aprovar por resíduo', async () => {
    fetch.mockResolvedValue(ok);

    const { result } = renderHook(() => useAprovarResiduos(), { wrapper });
    act(() => result.current.mutate([7, 8]));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetch.mock.calls.map(c => [c[0], c[1].method])).toEqual([
      ['/api/residuos/7/aprovar', 'PUT'],
      ['/api/residuos/8/aprovar', 'PUT'],
    ]);
    expect(result.current.data).toEqual({ concluidos: [7, 8], falhas: [] });
  });

  it('separa as aprovações recusadas com a mensagem do servidor, sem perder as concluídas', async () => {
    fetch.mockImplementation(async (url) => (url.includes('/8/') ? recusado('Só é possível aprovar resíduos com solicitação pendente.') : ok));

    const { result } = renderHook(() => useAprovarResiduos(), { wrapper });
    act(() => result.current.mutate([7, 8]));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({
      concluidos: [7],
      falhas: [{ id: 8, mensagem: 'Só é possível aprovar resíduos com solicitação pendente.' }],
    });
  });
});
