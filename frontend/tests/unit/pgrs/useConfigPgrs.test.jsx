import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useConfigPgrs } from '../../../src/pgrs/useConfigPgrs';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useConfigPgrs', () => {
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

  it('busca a configuração em /api/pgrs-config', async () => {
    fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ razaoSocial: 'Inst. X', cnpj: '' }) });

    const { result } = renderHook(() => useConfigPgrs(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetch.mock.calls[0][0]).toContain('/api/pgrs-config');
    expect(result.current.data.razaoSocial).toBe('Inst. X');
  });
});
