import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDeletarReagente } from '../../../src/reagentes/useDeletarReagente';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useDeletarReagente', () => {
  let mockFetch;

  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      data: {},
      setItem(k, v) { this.data[k] = String(v); },
      getItem(k) { return this.data[k] ?? null; },
      removeItem(k) { delete this.data[k]; },
      clear() { this.data = {}; },
    });
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('sends DELETE /api/reagentes/:id and sets isSuccess', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 204, json: async () => ({}) });

    const { result } = renderHook(() => useDeletarReagente(), { wrapper });
    act(() => result.current.mutate('R-001'));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetch.mock.calls[0][0]).toBe('/api/reagentes/R-001');
    expect(mockFetch.mock.calls[0][1].method).toBe('DELETE');
  });

  it('treats 404 as success (idempotent delete)', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({}) });

    const { result } = renderHook(() => useDeletarReagente(), { wrapper });
    act(() => result.current.mutate('R-GONE'));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('sets isError on server error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });

    const { result } = renderHook(() => useDeletarReagente(), { wrapper });
    act(() => result.current.mutate('R-001'));
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error.message).toBe('Erro ao deletar reagente');
  });
});
