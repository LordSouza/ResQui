import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCompatMatriz } from '../../../src/compat/useCompatMatriz';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useCompatMatriz', () => {
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

  it('fetches GET /api/compat/matriz', async () => {
    fetch.mockResolvedValueOnce({
      ok: true, status: 200,
      json: async () => ({ entries: [
        { classeA: 1, classeB: 1, nivel: 0 },
        { classeA: 1, classeB: 2, nivel: 1 },
      ]}),
    });
    const { result } = renderHook(() => useCompatMatriz(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetch.mock.calls[0][0]).toBe('/api/compat/matriz');
  });

  it('normaliza entries para { [classeA]: number[] } indexado por classeB-1', async () => {
    fetch.mockResolvedValueOnce({
      ok: true, status: 200,
      json: async () => ({ entries: [
        { classeA: 1, classeB: 1, nivel: 0 },
        { classeA: 1, classeB: 3, nivel: 3 },
        { classeA: 2, classeB: 1, nivel: 1 },
      ]}),
    });
    const { result } = renderHook(() => useCompatMatriz(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data.matrix[1][0]).toBe(0);
    expect(result.current.data.matrix[1][2]).toBe(3);
    expect(result.current.data.matrix[2][0]).toBe(1);
  });

  it('seta isError em resposta não-ok', async () => {
    fetch.mockResolvedValueOnce({
      ok: false, status: 500,
      text: async () => JSON.stringify({ message: 'Erro interno' }),
    });
    const { result } = renderHook(() => useCompatMatriz(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('returns empty matrix when entries are missing', async () => {
    fetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) });
    const { result } = renderHook(() => useCompatMatriz(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ matrix: {}, fonte: null });
  });

  it('expõe a fonte da matriz vinda da API', async () => {
    fetch.mockResolvedValueOnce({
      ok: true, status: 200,
      json: async () => ({
        entries: [{ classeA: 1, classeB: 1, nivel: 0 }],
        fonte: {
          fonte: 'EPA-600/2-80-076 — A Method for Determining the Compatibility of Hazardous Wastes (EPA, 1980)',
          referencia: 'Johnson, L. E. & Farr, J. K. (2008).',
          url: 'https://www.epa.gov/',
          revisadoEm: '2026-07-27',
          detalhamento: 'docs/compatibilidade-proveniencia.md',
        },
      }),
    });
    const { result } = renderHook(() => useCompatMatriz(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data.fonte.fonte).toContain('EPA-600/2-80-076');
    expect(result.current.data.fonte.revisadoEm).toBe('2026-07-27');
  });
});
