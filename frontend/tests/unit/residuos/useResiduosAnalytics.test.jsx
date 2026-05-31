import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useResiduosAnalytics } from '../../../src/residuos/useResiduosAnalytics';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const fakeAnalytics = {
  mensal: [{ mes: '2026-01', valor: 120.5 }, { mes: '2026-02', valor: 85.0 }],
  porLab: [{ lab: 'Lab A', valor: 340.0 }, { lab: 'Lab B', valor: 90.5 }],
};

describe('useResiduosAnalytics', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', { data: {}, setItem(k, v) { this.data[k] = String(v); }, getItem(k) { return this.data[k] ?? null; }, removeItem(k) { delete this.data[k]; }, clear() { this.data = {}; } });
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => vi.unstubAllGlobals());

  it('fetches /api/residuos/analytics com param meses', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => fakeAnalytics });
    const { result } = renderHook(() => useResiduosAnalytics({ meses: 6 }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const url = fetch.mock.calls[0][0];
    expect(url).toContain('/api/residuos/analytics');
    expect(url).toContain('meses=6');
  });

  it('retorna mensal e porLab', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => fakeAnalytics });
    const { result } = renderHook(() => useResiduosAnalytics(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data.mensal).toHaveLength(2);
    expect(result.current.data.porLab[0].lab).toBe('Lab A');
  });

  it('isError em resposta não-ok', async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 500, text: async () => JSON.stringify({ message: 'Erro' }) });
    const { result } = renderHook(() => useResiduosAnalytics(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
