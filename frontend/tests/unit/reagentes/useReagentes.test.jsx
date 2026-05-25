import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useReagentes } from '../../../src/reagentes/useReagentes';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useReagentes', () => {
  let mockFetch;

  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      data: {},
      setItem(k, v) { this.data[k] = String(v); },
      getItem(k) { return this.data[k] ?? null; },
      removeItem(k) { delete this.data[k]; },
      clear() { this.data = {}; },
    });
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('fetches /api/reagentes with default params', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true, status: 200,
      json: async () => ({ items: [], total: 0, page: 1, pageSize: 20 }),
    });

    const { result } = renderHook(() => useReagentes(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const url = mockFetch.mock.calls[0][0];
    expect(url).toBe('/api/reagentes?page=1&pageSize=20');
  });

  it('appends q, classe and vencendo to URL when set', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true, status: 200,
      json: async () => ({ items: [], total: 0, page: 1, pageSize: 20 }),
    });

    const { result } = renderHook(
      () => useReagentes({ page: 2, pageSize: 10, q: 'etanol', classe: '5', vencendo: true }),
      { wrapper }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const url = mockFetch.mock.calls[0][0];
    expect(url).toContain('page=2');
    expect(url).toContain('pageSize=10');
    expect(url).toContain('q=etanol');
    expect(url).toContain('classe=5');
    expect(url).toContain('vencendo=true');
  });

  it('normalizes classeReatividade → classe and validadeStatus → validade_status', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true, status: 200,
      json: async () => ({
        items: [{
          id: 'R-001', nome: 'Etanol',
          classeReatividade: 5, validadeStatus: 'expira-breve', estoqueMin: 0.5,
          ghs: { pictos: ['flame', 'exclam'], signal: 'Perigo', frasesH: [], frasesP: [] },
        }],
        total: 1, page: 1, pageSize: 20,
      }),
    });

    const { result } = renderHook(() => useReagentes(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const item = result.current.data.items[0];
    expect(item.classe).toBe(5);
    expect(item.validade_status).toBe('expira-breve');
    expect(item.estoque_min).toBe(0.5);
    expect(item.pictos).toEqual(['flame', 'exclam']);
    expect(item.signal).toBe('Perigo');
  });

  it('defaults pictos to [] and signal to empty string when ghs is absent', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true, status: 200,
      json: async () => ({
        items: [{ id: 'R-002', nome: 'Agua', classeReatividade: 1, validadeStatus: 'ok', estoqueMin: null }],
        total: 1, page: 1, pageSize: 20,
      }),
    });

    const { result } = renderHook(() => useReagentes(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const item = result.current.data.items[0];
    expect(item.pictos).toEqual([]);
    expect(item.signal).toBe('');
  });

  it('sets isError on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });

    const { result } = renderHook(() => useReagentes(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error.message).toBe('Erro ao carregar reagentes');
  });
});
