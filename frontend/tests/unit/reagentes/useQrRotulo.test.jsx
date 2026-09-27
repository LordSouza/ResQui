import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useQrRotulo } from '../../../src/reagentes/useQrRotulo';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useQrRotulo', () => {
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

  it('busca o PNG do QR e o entrega como data URL', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true, status: 200,
      blob: async () => new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], { type: 'image/png' }),
    });
    const { result } = renderHook(() => useQrRotulo('R-00007'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch.mock.calls[0][0]).toBe('/api/reagentes/R-00007/rotulo/qr');
    expect(result.current.data).toMatch(/^data:image\/png;base64,/);
  });

  it('não busca sem id', () => {
    renderHook(() => useQrRotulo(null), { wrapper });
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
