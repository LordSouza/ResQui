import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUsuarios } from '../../../src/usuarios/useUsuarios';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useUsuarios', () => {
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

  it('fetches GET /api/usuarios', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => [] });
    const { result } = renderHook(() => useUsuarios(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch.mock.calls[0][0]).toBe('/api/usuarios');
    expect(result.current.data).toEqual([]);
  });

  it('deriva status=ativo quando arquivado=false', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true, status: 200,
      json: async () => [{ id: 'u1', email: 'a@b.com', nome: 'Ana Lima', matricula: null, papel: 'Admin', roles: ['Admin'], arquivado: false }],
    });
    const { result } = renderHook(() => useUsuarios(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data[0].status).toBe('ativo');
  });

  it('deriva status=arquivado quando arquivado=true', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true, status: 200,
      json: async () => [{ id: 'u2', email: 'b@c.com', nome: 'Bruno', matricula: null, papel: 'Tecnico', roles: ['Tecnico'], arquivado: true }],
    });
    const { result } = renderHook(() => useUsuarios(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data[0].status).toBe('arquivado');
  });

  it('deriva iniciais de 2 letras do nome', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true, status: 200,
      json: async () => [{ id: 'u1', email: 'a@b.com', nome: 'Ana Lima', matricula: null, papel: 'Admin', roles: [], arquivado: false }],
    });
    const { result } = renderHook(() => useUsuarios(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data[0].iniciais).toBe('AL');
  });

  it('usa email como nome quando nome é null', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true, status: 200,
      json: async () => [{ id: 'u1', email: 'ana@b.com', nome: null, matricula: null, papel: 'Admin', roles: [], arquivado: false }],
    });
    const { result } = renderHook(() => useUsuarios(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data[0].nome).toBe('ana@b.com');
  });

  it('sets isError em resposta não-ok', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, text: async () => JSON.stringify({ message: 'Erro ao carregar usuários' }) });
    const { result } = renderHook(() => useUsuarios(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error.message).toBe('Erro ao carregar usuários');
  });
});
