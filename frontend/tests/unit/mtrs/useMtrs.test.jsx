import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMtrs } from '../../../src/mtrs/useMtrs';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const fakeMtr = { id: 1, numero: 'MTR-2026-0001', gerador: 'Unifei', transportadora: 'EcoLog', dataEmissao: '2026-01-01', destinador: 'EcoQ', codigoIbama: 'A099', massa: 10.0, residuoIds: [1, 2] };

describe('useMtrs', () => {
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

  it('fetches /api/mtrs e normaliza campos', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => [fakeMtr] });

    const { result } = renderHook(() => useMtrs(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const m = result.current.data[0];
    expect(m.codigo_ibama).toBe('A099');
    expect(m.residuo_ids).toEqual([1, 2]);
  });

  it('normaliza dataDestinacao, destinadoPorId e destinadoPorNome', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ ...fakeMtr, dataDestinacao: '2026-08-04', destinadoPorId: 'u-1', destinadoPorNome: 'Maria Souza' }],
    });

    const { result } = renderHook(() => useMtrs(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data[0].data_destinacao).toBe('2026-08-04');
    expect(result.current.data[0].destinado_por_id).toBe('u-1');
    expect(result.current.data[0].destinado_por_nome).toBe('Maria Souza');
  });

  it('deixa data_destinacao nula em manifesto ainda não destinado', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => [fakeMtr] });

    const { result } = renderHook(() => useMtrs(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data[0].data_destinacao).toBeNull();
  });
});
