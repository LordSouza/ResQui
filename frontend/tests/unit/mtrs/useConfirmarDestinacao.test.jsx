import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useConfirmarDestinacao } from '../../../src/mtrs/useConfirmarDestinacao';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useConfirmarDestinacao', () => {
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

  it('POST /api/mtrs/:id/destinacao com a data no corpo', async () => {
    fetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ id: 1, dataDestinacao: '2026-08-04' }) });

    const { result } = renderHook(() => useConfirmarDestinacao(), { wrapper });
    act(() => result.current.mutate({ id: 1, data: '2026-08-04' }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetch.mock.calls[0][0]).toBe('/api/mtrs/1/destinacao');
    expect(fetch.mock.calls[0][1].method).toBe('POST');
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ Data: '2026-08-04' });
  });

  it('propaga a mensagem do servidor quando o manifesto já está destinado', async () => {
    fetch.mockResolvedValueOnce({
      ok: false, status: 400,
      text: async () => JSON.stringify({ message: 'Manifesto já destinado em 03/08/2026.' }),
    });

    const { result } = renderHook(() => useConfirmarDestinacao(), { wrapper });
    act(() => result.current.mutate({ id: 1, data: '2026-08-04' }));
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error.message).toMatch(/já destinado/);
  });
});
