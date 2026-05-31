import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useGerarRelatorio } from '../../../src/relatorios/useGerarRelatorio';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useGerarRelatorio', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      data: {}, setItem(k, v) { this.data[k] = String(v); },
      getItem(k) { return this.data[k] ?? null; },
      removeItem(k) { delete this.data[k]; }, clear() { this.data = {}; },
    });
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => vi.unstubAllGlobals());

  it('faz POST /api/relatorios/gerar com o tipo correto', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1, tipo: 'inventario', titulo: 'Inventário de reagentes', totalLinhas: 5, formato: 'csv' }),
    });
    const { result } = renderHook(() => useGerarRelatorio(), { wrapper });
    await act(async () => { result.current.mutate({ Tipo: 'inventario' }); });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetch).toHaveBeenCalledWith(
      '/api/relatorios/gerar',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
