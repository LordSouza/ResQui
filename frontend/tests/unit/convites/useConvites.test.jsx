import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useConvites } from '../../../src/convites/useConvites';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useConvites', () => {
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

  it('busca GET /api/convites', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ([{ id: 1, papel: 'Aluno', status: 'pendente' }]) });
    const { result } = renderHook(() => useConvites(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetch.mock.calls[0][0]).toBe('/api/convites');
    expect(result.current.data[0].status).toBe('pendente');
  });

  it('não busca quando enabled é false', () => {
    renderHook(() => useConvites({ enabled: false }), { wrapper });

    expect(mockFetch).not.toHaveBeenCalled();
  });
});
