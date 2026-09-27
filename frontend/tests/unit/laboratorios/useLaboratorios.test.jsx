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

  it('sets isError em resposta não-ok', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, text: async () => JSON.stringify({ message: 'Erro ao carregar laboratórios' }) });
    const { result } = renderHook(() => useLaboratorios(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error.message).toBe('Erro ao carregar laboratórios');
  });
});
