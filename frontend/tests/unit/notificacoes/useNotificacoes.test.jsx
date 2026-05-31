import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useNotificacoes } from '../../../src/notificacoes/useNotificacoes';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useNotificacoes', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', { data: {}, setItem(k, v) { this.data[k] = String(v); }, getItem(k) { return this.data[k] ?? null; }, removeItem(k) { delete this.data[k]; }, clear() { this.data = {}; } });
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => vi.unstubAllGlobals());

  it('chama GET /api/notificacoes', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: 1, mensagem: 'Acetona vence', lida: false, criadaEm: '2026-05-25T10:00:00Z', tipo: 'expiry', referenciaId: 'R-00001', severidade: 'red' }],
      text: async () => JSON.stringify([{ id: 1, mensagem: 'Acetona vence', lida: false, criadaEm: '2026-05-25T10:00:00Z', tipo: 'expiry', referenciaId: 'R-00001', severidade: 'red' }]),
    });

    const { result } = renderHook(() => useNotificacoes(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetch).toHaveBeenCalledWith('/api/notificacoes', expect.any(Object));
    expect(result.current.data[0].criada_em).toBe('2026-05-25T10:00:00Z');
    expect(result.current.data[0].referencia_id).toBe('R-00001');
  });

  it('retorna array vazio quando API retorna vazio', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => [], text: async () => '[]' });
    const { result } = renderHook(() => useNotificacoes(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});
