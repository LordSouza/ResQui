import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCriarResiduo } from '../../../src/residuos/useCriarResiduo';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useCriarResiduo', () => {
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

  it('POST /api/residuos com cmd e isSuccess', async () => {
    fetch.mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({ id: 10 }) });

    const { result } = renderHook(() => useCriarResiduo(), { wrapper });
    const cmd = { Descricao: 'R', LaboratorioId: 1, Tipo: 'Solventes', Volume: 4.2, Unidade: 'L', Composicao: 'Acetona', Risco: 'medio', Destino: null };

    act(() => result.current.mutate(cmd));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetch.mock.calls[0][0]).toBe('/api/residuos');
    expect(fetch.mock.calls[0][1].method).toBe('POST');
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual(cmd);
  });

  it('isError em resposta não-ok', async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({}) });

    const { result } = renderHook(() => useCriarResiduo(), { wrapper });
    act(() => result.current.mutate({ Nome: 'X' }));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error.message).toBe('Erro ao registrar resíduo');
  });
});
