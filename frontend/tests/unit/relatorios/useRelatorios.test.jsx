import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRelatorios } from '../../../src/relatorios/useRelatorios';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const fakeRelatorio = {
  id: 1, tipo: 'inventario', titulo: 'Inventário de reagentes',
  geradoEm: '2026-01-15T00:00:00Z', geradoPorId: 'u1',
  totalLinhas: 42, formato: 'csv',
};

describe('useRelatorios', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      data: {}, setItem(k, v) { this.data[k] = String(v); },
      getItem(k) { return this.data[k] ?? null; },
      removeItem(k) { delete this.data[k]; }, clear() { this.data = {}; },
    });
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => vi.unstubAllGlobals());

  it('fetches /api/relatorios', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => [fakeRelatorio] });
    const { result } = renderHook(() => useRelatorios(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetch.mock.calls[0][0]).toContain('/api/relatorios');
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data[0].tipo).toBe('inventario');
  });

  it('isError em resposta não-ok', async () => {
    fetch.mockResolvedValueOnce({
      ok: false, status: 500,
      text: async () => JSON.stringify({ message: 'Erro' }),
    });
    const { result } = renderHook(() => useRelatorios(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
