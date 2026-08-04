import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useReabrirDestinacao } from '../../../src/mtrs/useReabrirDestinacao';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useReabrirDestinacao', () => {
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

  it('DELETE /api/mtrs/:id/destinacao', async () => {
    fetch.mockResolvedValueOnce({ ok: true, status: 204, text: async () => '' });

    const { result } = renderHook(() => useReabrirDestinacao(), { wrapper });
    act(() => result.current.mutate(7));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetch.mock.calls[0][0]).toBe('/api/mtrs/7/destinacao');
    expect(fetch.mock.calls[0][1].method).toBe('DELETE');
  });

  it('propaga a mensagem do servidor quando o manifesto não está destinado', async () => {
    fetch.mockResolvedValueOnce({
      ok: false, status: 400,
      text: async () => JSON.stringify({ message: 'Manifesto não está destinado.' }),
    });

    const { result } = renderHook(() => useReabrirDestinacao(), { wrapper });
    act(() => result.current.mutate(7));
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error.message).toMatch(/não está destinado/);
  });
});
