import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCriarLaboratorio } from '../../../src/laboratorios/useCriarLaboratorio';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useCriarLaboratorio', () => {
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

  it('envia POST /api/laboratorios com o cmd e seta isSuccess', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({ id: 'Lab-001' }) });
    const { result } = renderHook(() => useCriarLaboratorio(), { wrapper });
    const cmd = {
      Nome: 'Novo Lab', Responsavel: 'Prof. X', Email: null,
      Areas: [], Sala: 'Bloco A · 2º andar · Sala 201', Armarios: ['Armário A'],
      Capacidade: 30, AreaM2: 50.0, Ventilacao: 'chapel', Cor: '#1465c0',
    };
    act(() => result.current.mutate(cmd));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch.mock.calls[0][0]).toBe('/api/laboratorios');
    expect(mockFetch.mock.calls[0][1].method).toBe('POST');
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual(cmd);
  });

  it('seta isError em resposta não-ok', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 400, text: async () => JSON.stringify({ message: 'Erro ao criar laboratório' }) });
    const { result } = renderHook(() => useCriarLaboratorio(), { wrapper });
    act(() => result.current.mutate({}));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error.message).toBe('Erro ao criar laboratório');
  });
});
