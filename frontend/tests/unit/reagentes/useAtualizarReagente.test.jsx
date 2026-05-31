import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAtualizarReagente } from '../../../src/reagentes/useAtualizarReagente';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useAtualizarReagente', () => {
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

  it('sends PUT /api/reagentes/:id with body (id extracted from payload)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true, status: 200,
      json: async () => ({ id: 'R-001', nome: 'Atualizado' }),
    });

    const { result } = renderHook(() => useAtualizarReagente(), { wrapper });
    const payload = { id: 'R-001', Nome: 'Atualizado', Estoque: 2.5, Local: 'Lab-201', Responsavel: 'Prof X', Validade: '2028-01-01' };

    act(() => result.current.mutate(payload));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetch.mock.calls[0][0]).toBe('/api/reagentes/R-001');
    expect(mockFetch.mock.calls[0][1].method).toBe('PUT');
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body).not.toHaveProperty('id');
    expect(body.Nome).toBe('Atualizado');
  });

  it('sets isError on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 422, text: async () => JSON.stringify({ message: 'Erro ao atualizar reagente' }) });

    const { result } = renderHook(() => useAtualizarReagente(), { wrapper });
    act(() => result.current.mutate({ id: 'R-001', Nome: 'X' }));
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error.message).toBe('Erro ao atualizar reagente');
  });
});
