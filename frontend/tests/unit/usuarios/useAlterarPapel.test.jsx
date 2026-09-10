import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAlterarPapel } from '../../../src/usuarios/useAlterarPapel';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useAlterarPapel', () => {
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

  it('envia PUT /api/usuarios/u1/papel com NovoPapel', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 204, json: async () => null });
    const { result } = renderHook(() => useAlterarPapel(), { wrapper });
    act(() => result.current.mutate({ id: 'u1', NovoPapel: 'Professor' }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch.mock.calls[0][0]).toBe('/api/usuarios/u1/papel');
    expect(mockFetch.mock.calls[0][1].method).toBe('PUT');
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({ NovoPapel: 'Professor' });
  });

  it('seta isError em resposta não-ok', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 400, text: async () => JSON.stringify({ message: 'Erro ao alterar papel' }) });
    const { result } = renderHook(() => useAlterarPapel(), { wrapper });
    act(() => result.current.mutate({ id: 'u1', NovoPapel: 'X' }));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error.message).toBe('Erro ao alterar papel');
  });
});
