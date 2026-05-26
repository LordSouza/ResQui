import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuditoria } from '../../../src/auditoria/useAuditoria';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useAuditoria', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      data: {},
      setItem(k, v) { this.data[k] = String(v); },
      getItem(k) { return this.data[k] ?? null; },
      removeItem(k) { delete this.data[k]; },
      clear() { this.data = {}; },
    });
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => vi.unstubAllGlobals());

  const fakeEntry = {
    id: 'aaa-bbb',
    timestamp: '2026-05-25T20:00:00Z',
    who: 'ana@lab.com',
    what: 'reagente.criar',
    where: 'Inventário',
    detail: 'Criou R-001',
    risk: 'low',
  };

  it('fetches /api/auditoria sem filtros', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => [fakeEntry] });

    const { result } = renderHook(() => useAuditoria({}), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const url = fetch.mock.calls[0][0];
    expect(url).toContain('/api/auditoria');
  });

  it('normaliza timestamp → ts', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => [fakeEntry] });

    const { result } = renderHook(() => useAuditoria({}), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data[0].ts).toBe('2026-05-25T20:00:00Z');
    expect(result.current.data[0].who).toBe('ana@lab.com');
  });

  it('passa filtro who como query param', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => [] });

    renderHook(() => useAuditoria({ who: 'ana@lab.com' }), { wrapper });
    await waitFor(() => expect(fetch).toHaveBeenCalled());

    const url = fetch.mock.calls[0][0];
    expect(url).toContain('who=ana%40lab.com');
  });

  it('passa filtros from e to como query params', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => [] });

    renderHook(() => useAuditoria({ from: '2026-01-01', to: '2026-05-31' }), { wrapper });
    await waitFor(() => expect(fetch).toHaveBeenCalled());

    const url = fetch.mock.calls[0][0];
    expect(url).toContain('from=2026-01-01');
    expect(url).toContain('to=2026-05-31');
  });

  it('isError em resposta não-ok', async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });

    const { result } = renderHook(() => useAuditoria({}), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
