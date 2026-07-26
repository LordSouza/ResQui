import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSalvarConfigPgrs } from '../../../src/pgrs/useSalvarConfigPgrs';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useSalvarConfigPgrs', () => {
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

  it('envia PUT com o comando', async () => {
    fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ razaoSocial: 'Inst. Y' }) });

    const { result } = renderHook(() => useSalvarConfigPgrs(), { wrapper });
    result.current.mutate({ RazaoSocial: 'Inst. Y', Cnpj: '12.345.678/0001-95' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const [url, opts] = fetch.mock.calls[0];
    expect(url).toContain('/api/pgrs-config');
    expect(opts.method).toBe('PUT');
    expect(JSON.parse(opts.body).RazaoSocial).toBe('Inst. Y');
  });
});
