import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAssistente } from '../../../src/chat/useAssistente';

const wrapper = ({ children }) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

describe('useAssistente', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      data: {},
      setItem(k, v) { this.data[k] = String(v); },
      getItem(k) { return this.data[k] ?? null; },
      removeItem(k) { delete this.data[k]; },
      clear() { this.data = {}; },
    });
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => vi.unstubAllGlobals());

  it('envia mensagem e histórico para POST /api/assistente/mensagem', async () => {
    fetch.mockResolvedValueOnce({
      ok: true, status: 200,
      json: async () => ({ say: 'abrindo', action: 'detail', params: { id: 'R-001' } }),
    });

    const { result } = renderHook(() => useAssistente(), { wrapper });
    result.current.mutate({ mensagem: 'abre o HCl', historico: [{ Papel: 'user', Texto: 'oi' }] });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetch.mock.calls[0][0]).toBe('/api/assistente/mensagem');
    expect(fetch.mock.calls[0][1].method).toBe('POST');
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
      Mensagem: 'abre o HCl',
      Historico: [{ Papel: 'user', Texto: 'oi' }],
    });
    expect(result.current.data).toEqual({ say: 'abrindo', action: 'detail', params: { id: 'R-001' } });
  });

  it('propaga a mensagem do servidor no erro', async () => {
    fetch.mockResolvedValueOnce({
      ok: false, status: 400,
      text: async () => JSON.stringify({ message: 'O assistente não respondeu a tempo.' }),
    });

    const { result } = renderHook(() => useAssistente(), { wrapper });
    result.current.mutate({ mensagem: 'oi', historico: [] });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error.message).toBe('O assistente não respondeu a tempo.');
  });

  it('marca status 503 no erro para a tela distinguir indisponibilidade', async () => {
    fetch.mockResolvedValueOnce({
      ok: false, status: 503,
      text: async () => JSON.stringify({ message: 'O assistente não está configurado nesta instalação.' }),
    });

    const { result } = renderHook(() => useAssistente(), { wrapper });
    result.current.mutate({ mensagem: 'oi', historico: [] });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error.status).toBe(503);
  });
});
