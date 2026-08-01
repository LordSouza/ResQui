import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useIdentificacaoPgrs } from '../../../src/pgrs/useIdentificacaoPgrs';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useIdentificacaoPgrs', () => {
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

  it('busca o recorte em /api/pgrs-config/identificacao, não o config completo', async () => {
    fetch.mockResolvedValue({
      ok: true, status: 200,
      json: async () => ({ razaoSocial: 'Inst. X', unidade: 'Campus Y' }),
    });

    const { result } = renderHook(() => useIdentificacaoPgrs(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetch.mock.calls[0][0]).toContain('/api/pgrs-config/identificacao');
    expect(result.current.data.razaoSocial).toBe('Inst. X');
    expect(result.current.data.unidade).toBe('Campus Y');
  });

  it('usa queryKey própria, para não colidir com o cache de useConfigPgrs', async () => {
    fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ razaoSocial: '', unidade: '' }) });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const localWrapper = ({ children }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;

    const { result } = renderHook(() => useIdentificacaoPgrs(), { wrapper: localWrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(qc.getQueryData(['identificacao-pgrs'])).toBeDefined();
    expect(qc.getQueryData(['config-pgrs'])).toBeUndefined();
  });
});
