import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDeletarLaboratorio } from '../../../src/laboratorios/useDeletarLaboratorio';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useDeletarLaboratorio', () => {
  let mockFetch;
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      data: {}, setItem(k, v) { this.data[k] = String(v); },
      getItem(k) { return this.data[k] ?? null; },
      removeItem(k) { delete this.data[k]; },
      clear() { this.data = {}; },
    });
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('envia DELETE /api/laboratorios/Lab-001 e seta isSuccess', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 204, json: async () => null });
    const { result } = renderHook(() => useDeletarLaboratorio(), { wrapper });
    act(() => result.current.mutate('Lab-001'));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch.mock.calls[0][0]).toBe('/api/laboratorios/Lab-001');
    expect(mockFetch.mock.calls[0][1].method).toBe('DELETE');
  });

  it('seta isError em resposta não-ok (exceto 404)', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, text: async () => JSON.stringify({ message: 'Erro ao remover laboratório' }) });
    const { result } = renderHook(() => useDeletarLaboratorio(), { wrapper });
    act(() => result.current.mutate('Lab-001'));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error.message).toBe('Erro ao remover laboratório');
  });

  it('não seta isError em 404', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404, text: async () => '' });
    const { result } = renderHook(() => useDeletarLaboratorio(), { wrapper });
    act(() => result.current.mutate('Lab-999'));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
