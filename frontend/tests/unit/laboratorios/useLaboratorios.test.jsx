import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useLaboratorios } from '../../../src/laboratorios/useLaboratorios';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useLaboratorios', () => {
  let mockFetch;

  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      data: {}, setItem(k, v) { this.data[k] = String(v); },
      getItem(k) { return this.data[k] ?? null; },
      removeItem(k) { delete this.data[k]; },
      clear() { this.data = {}; },
    });
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('fetches GET /api/laboratorios e retorna array vazio', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => [] });
    const { result } = renderHook(() => useLaboratorios(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch.mock.calls[0][0]).toBe('/api/laboratorios');
    expect(result.current.data).toEqual([]);
  });

  it('normaliza areaM2 → area_m2', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true, status: 200,
      json: async () => [{
        id: 'Lab-001', nome: 'Química', responsavel: 'Prof. X', email: null,
        areas: [], sala: 'Bloco A · 2º andar · Sala 201', armarios: [],
        capacidade: 30, areaM2: 52.5, ventilacao: 'chapel', cor: '#1465c0', criado: '2024-01-01',
      }],
    });
    const { result } = renderHook(() => useLaboratorios(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data[0].area_m2).toBe(52.5);
    expect(result.current.data[0].areaM2).toBe(52.5);
  });

  it('sets isError em resposta não-ok', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, text: async () => JSON.stringify({ message: 'Erro ao carregar laboratórios' }) });
    const { result } = renderHook(() => useLaboratorios(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error.message).toBe('Erro ao carregar laboratórios');
  });
});
