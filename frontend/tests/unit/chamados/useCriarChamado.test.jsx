import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCriarChamado } from '../../../src/chamados/useCriarChamado';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useCriarChamado', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', { data: {}, setItem(k, v) { this.data[k] = String(v); }, getItem(k) { return this.data[k] ?? null; }, removeItem(k) { delete this.data[k]; }, clear() { this.data = {}; } });
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => vi.unstubAllGlobals());

  it('faz POST /api/chamados com o payload correto', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 1 }) });
    const { result } = renderHook(() => useCriarChamado(), { wrapper });
    await act(async () => {
      result.current.mutate({ Titulo: 'Bug', Descricao: 'Erro', LaboratorioId: 1, Tipo: 'Bug', Severidade: 'Alta' });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetch).toHaveBeenCalledWith('/api/chamados', expect.objectContaining({ method: 'POST' }));
  });
});
