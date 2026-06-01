import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSalvarCompatOverride } from '../../../src/compat/useSalvarCompatOverride';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useSalvarCompatOverride', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      data: {}, setItem(k, v) { this.data[k] = String(v); },
      getItem(k) { return this.data[k] ?? null; },
      removeItem(k) { delete this.data[k]; },
      clear() { this.data = {}; },
    });
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => vi.unstubAllGlobals());

  it('envia PUT /api/compat/overrides/{a}/{b} com body correto', async () => {
    fetch.mockResolvedValueOnce({
      ok: true, status: 200,
      json: async () => ({ classeA: 1, classeB: 3, nivel: 2, motivo: 'Teste', autor: 'Ana', dataEdicao: '2026-01-01' }),
    });
    const { result } = renderHook(() => useSalvarCompatOverride(), { wrapper });
    act(() => result.current.mutate({ classeA: 1, classeB: 3, Nivel: 2, Motivo: 'Teste', Autor: 'Ana' }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetch.mock.calls[0][0]).toBe('/api/compat/overrides/1/3');
    expect(fetch.mock.calls[0][1].method).toBe('PUT');
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body).toEqual({ Nivel: 2, Motivo: 'Teste', Autor: 'Ana' });
  });

  it('seta isError em resposta não-ok', async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 400, text: async () => JSON.stringify({ message: 'Par inválido' }) });
    const { result } = renderHook(() => useSalvarCompatOverride(), { wrapper });
    act(() => result.current.mutate({ classeA: 99, classeB: 99, Nivel: 1, Motivo: '', Autor: '' }));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error.message).toBe('Par inválido');
  });
});
