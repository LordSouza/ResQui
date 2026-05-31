import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useGetNotificacaoPrefs } from '../../../src/notificacoes/useGetNotificacaoPrefs';
import { useNotificacaoPrefs } from '../../../src/notificacoes/useNotificacaoPrefs';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useGetNotificacaoPrefs', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', { data: {}, setItem(k, v) { this.data[k] = String(v); }, getItem(k) { return this.data[k] ?? null; }, removeItem(k) { delete this.data[k]; }, clear() { this.data = {}; } });
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => vi.unstubAllGlobals());

  it('chama GET /api/notificacoes/prefs', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ expiry: true, 'low-stock': false, sinir: false, compat: true, coleta: false }),
      text: async () => JSON.stringify({ expiry: true, 'low-stock': false, sinir: false, compat: true, coleta: false }),
    });
    const { result } = renderHook(() => useGetNotificacaoPrefs(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetch).toHaveBeenCalledWith('/api/notificacoes/prefs', expect.any(Object));
    expect(result.current.data.expiry).toBe(true);
  });
});

describe('useNotificacaoPrefs', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', { data: {}, setItem(k, v) { this.data[k] = String(v); }, getItem(k) { return this.data[k] ?? null; }, removeItem(k) { delete this.data[k]; }, clear() { this.data = {}; } });
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => vi.unstubAllGlobals());

  it('faz PUT /api/notificacoes/prefs', async () => {
    fetch.mockResolvedValueOnce({ ok: true });
    const { result } = renderHook(() => useNotificacaoPrefs(), { wrapper });
    await act(async () => {
      result.current.mutate({ expiry: true, 'low-stock': true, sinir: false, compat: false, coleta: false });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetch).toHaveBeenCalledWith('/api/notificacoes/prefs', expect.objectContaining({ method: 'PUT' }));
  });
});
