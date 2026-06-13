import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useResíduos } from '../../../src/residuos/useResíduos';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useResíduos', () => {
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

  it('fetches /api/residuos com params', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: 1, descricao: 'R1', laboratorioId: 1, mtrId: null, status: 'aguardando-coleta', dataRegistro: '2026-01-01', tipo: 'Solventes', volume: 4.2, unidade: 'L', composicao: 'Acetona', risco: 'medio', destino: null }],
    });

    const { result } = renderHook(() => useResíduos({ status: 'aguardando-coleta' }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const url = fetch.mock.calls[0][0];
    expect(url).toContain('/api/residuos');
    expect(url).toContain('status=aguardando-coleta');
  });

  it('normaliza laboratorioId → lab_id e mtrId → mtr_id', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: 1, descricao: 'R1', laboratorioId: 2, mtrId: 5, status: 'em-coleta', dataRegistro: '2026-01-01', tipo: 'Ácidos', volume: 2.0, unidade: 'L', composicao: 'HCl', risco: 'alto', destino: null }],
    });

    const { result } = renderHook(() => useResíduos(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data[0].lab_id).toBe(2);
    expect(result.current.data[0].mtr_id).toBe(5);
  });

  it('isError em resposta não-ok', async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 500, text: async () => JSON.stringify({ message: 'Erro ao carregar resíduos' }) });

    const { result } = renderHook(() => useResíduos(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('returns empty array when body is null', async () => {
    fetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => null });
    const { result } = renderHook(() => useResíduos(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});
