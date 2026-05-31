import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useChamados } from '../../../src/chamados/useChamados';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const fakeChamado = { id: 1, titulo: 'Bug login', descricao: 'Erro ao logar', status: 'aberto', tipo: 'bug', severidade: 'alta', laboratorioId: 1, abertoPorId: 'u1', criadoEm: '2026-01-01', comentarios: [] };

describe('useChamados', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', { data: {}, setItem(k, v) { this.data[k] = String(v); }, getItem(k) { return this.data[k] ?? null; }, removeItem(k) { delete this.data[k]; }, clear() { this.data = {}; } });
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => vi.unstubAllGlobals());

  it('fetches /api/chamados', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => [fakeChamado] });
    const { result } = renderHook(() => useChamados(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetch.mock.calls[0][0]).toContain('/api/chamados');
    expect(result.current.data).toHaveLength(1);
  });

  it('isError em resposta não-ok', async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 500, text: async () => JSON.stringify({ message: 'Erro' }) });
    const { result } = renderHook(() => useChamados(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
