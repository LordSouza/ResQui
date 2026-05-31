import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useComentarChamado } from '../../../src/chamados/useComentarChamado';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useComentarChamado', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', { data: {}, setItem(k, v) { this.data[k] = String(v); }, getItem(k) { return this.data[k] ?? null; }, removeItem(k) { delete this.data[k]; }, clear() { this.data = {}; } });
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => vi.unstubAllGlobals());

  it('faz POST /api/chamados/:id/comentarios', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 3 }) });
    const { result } = renderHook(() => useComentarChamado(), { wrapper });
    await act(async () => { result.current.mutate({ id: 3, texto: 'Investigando...' }); });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetch).toHaveBeenCalledWith('/api/chamados/3/comentarios', expect.objectContaining({ method: 'POST' }));
  });
});
