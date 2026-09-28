import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTransferirReagente } from '../../../src/reagentes/useTransferirReagente';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useTransferirReagente', () => {
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

  it('sends POST /api/reagentes/:id/transferencia with LaboratorioId and Armario body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true, status: 200,
      json: async () => ({ id: 'R-001', local: 'Lab-203 · Armário Inflamáveis · Pra. 1' }),
    });

    const { result } = renderHook(() => useTransferirReagente('R-001'), { wrapper });
    act(() => result.current.mutate({ laboratorioId: 'Lab-203', armario: 'Armário Inflamáveis' }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetch.mock.calls[0][0]).toBe('/api/reagentes/R-001/transferencia');
    expect(mockFetch.mock.calls[0][1].method).toBe('POST');
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({ LaboratorioId: 'Lab-203', Armario: 'Armário Inflamáveis' });
  });

  it('sets isError on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 400, text: async () => JSON.stringify({ message: 'Reagente já está em X.' }) });

    const { result } = renderHook(() => useTransferirReagente('R-001'), { wrapper });
    act(() => result.current.mutate({ laboratorioId: 'X', armario: '' }));
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error.message).toBe('Reagente já está em X.');
  });
});
