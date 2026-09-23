import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDefinirLaboratorios } from '../../../src/usuarios/useDefinirLaboratorios';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useDefinirLaboratorios', () => {
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

  it('envia PUT com a lista de laboratórios', async () => {
    fetch.mockResolvedValue({ ok: true, status: 204, text: async () => '' });
    const { result } = renderHook(() => useDefinirLaboratorios(), { wrapper });

    result.current.mutate({ id: 'u-1', laboratorioIds: ['Lab-001', 'Lab-002'] });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const [url, opts] = fetch.mock.calls[0];
    expect(url).toBe('/api/usuarios/u-1/laboratorios');
    expect(opts.method).toBe('PUT');
    expect(JSON.parse(opts.body)).toEqual({ LaboratorioIds: ['Lab-001', 'Lab-002'] });
  });

  it('repassa a mensagem do servidor quando o vínculo é recusado', async () => {
    fetch.mockResolvedValue({
      ok: false, status: 400,
      text: async () => JSON.stringify({ message: 'Você não responde pelo laboratório Lab-002.' }),
    });
    const { result } = renderHook(() => useDefinirLaboratorios(), { wrapper });

    result.current.mutate({ id: 'u-1', laboratorioIds: ['Lab-002'] });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error.message).toMatch(/Lab-002/);
  });
});
