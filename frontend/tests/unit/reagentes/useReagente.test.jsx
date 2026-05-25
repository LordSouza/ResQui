import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useReagente } from '../../../src/reagentes/useReagente';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useReagente', () => {
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

  it('fetches /api/reagentes/:id and normalizes shape', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true, status: 200,
      json: async () => ({
        id: 'R-001', nome: 'Etanol', classeReatividade: 5, validadeStatus: 'ok',
        estoqueMin: 1.0, aberturaData: '2025-01-10',
        ghs: { pictos: ['flame'], signal: 'Perigo', frasesH: ['H225'], frasesP: ['P210'] },
      }),
    });

    const { result } = renderHook(() => useReagente('R-001'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetch.mock.calls[0][0]).toBe('/api/reagentes/R-001');
    const r = result.current.data;
    expect(r.classe).toBe(5);
    expect(r.validade_status).toBe('ok');
    expect(r.estoque_min).toBe(1.0);
    expect(r.abertura).toBe('2025-01-10');
    expect(r.pictos).toEqual(['flame']);
    expect(r.signal).toBe('Perigo');
    expect(r.h).toEqual(['H225']);
    expect(r.p).toEqual(['P210']);
  });

  it('returns null on 404 without throwing', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({}) });

    const { result } = renderHook(() => useReagente('R-MISSING'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBeNull();
  });

  it('does not fetch when id is falsy', () => {
    renderHook(() => useReagente(null), { wrapper });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('sets isError on server error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });

    const { result } = renderHook(() => useReagente('R-001'), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error.message).toBe('Erro ao carregar reagente');
  });
});
