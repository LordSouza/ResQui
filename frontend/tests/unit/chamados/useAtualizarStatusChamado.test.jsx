import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAtualizarStatusChamado } from '../../../src/chamados/useAtualizarStatusChamado';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useAtualizarStatusChamado', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', { data: {}, setItem(k, v) { this.data[k] = String(v); }, getItem(k) { return this.data[k] ?? null; }, removeItem(k) { delete this.data[k]; }, clear() { this.data = {}; } });
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => vi.unstubAllGlobals());

  it('faz PUT /api/chamados/:id/status', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 5, status: 'fechado' }) });
    const { result } = renderHook(() => useAtualizarStatusChamado(), { wrapper });
    await act(async () => { result.current.mutate({ id: 5, status: 'Fechado' }); });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetch).toHaveBeenCalledWith('/api/chamados/5/status', expect.objectContaining({ method: 'PUT' }));
  });
});
