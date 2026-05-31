import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCriarReagente } from '../../../src/reagentes/useCriarReagente';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useCriarReagente', () => {
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

  it('sends POST /api/reagentes with cmd body and sets isSuccess', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true, status: 201,
      json: async () => ({ id: 'R-999', nome: 'Novo' }),
    });

    const { result } = renderHook(() => useCriarReagente(), { wrapper });
    const cmd = { Nome: 'Novo', Cas: '64-17-5', ClasseReatividade: 5, Estoque: 1.0, Unidade: 'L' };

    act(() => result.current.mutate(cmd));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetch.mock.calls[0][0]).toBe('/api/reagentes');
    expect(mockFetch.mock.calls[0][1].method).toBe('POST');
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual(cmd);
  });

  it('sets isError on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 400, text: async () => JSON.stringify({ message: 'Erro ao criar reagente' }) });

    const { result } = renderHook(() => useCriarReagente(), { wrapper });
    act(() => result.current.mutate({ Nome: 'X' }));
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error.message).toBe('Erro ao criar reagente');
  });
});
