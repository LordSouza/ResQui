import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAtualizarLaboratorio } from '../../../src/laboratorios/useAtualizarLaboratorio';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useAtualizarLaboratorio', () => {
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

  it('envia PUT /api/laboratorios/Lab-001 sem id no body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true, status: 200,
      json: async () => ({ id: 'Lab-001', nome: 'Atualizado' }),
    });
    const { result } = renderHook(() => useAtualizarLaboratorio(), { wrapper });
    act(() => result.current.mutate({
      id: 'Lab-001', Nome: 'Atualizado', Responsavel: 'Prof.', Email: null,
      Areas: [], Sala: 'Sala 201', Armarios: [], Capacidade: 30, AreaM2: 50, Ventilacao: 'chapel', Cor: '#1465c0',
    }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch.mock.calls[0][0]).toBe('/api/laboratorios/Lab-001');
    expect(mockFetch.mock.calls[0][1].method).toBe('PUT');
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body).not.toHaveProperty('id');
    expect(body.Nome).toBe('Atualizado');
  });

  it('seta isError em resposta não-ok', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404, text: async () => JSON.stringify({ message: 'Erro ao atualizar laboratório' }) });
    const { result } = renderHook(() => useAtualizarLaboratorio(), { wrapper });
    act(() => result.current.mutate({ id: 'Lab-999', Nome: 'X' }));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error.message).toBe('Erro ao atualizar laboratório');
  });
});
