import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAtualizarPerfil } from '../../src/auth/useAtualizarPerfil';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useAtualizarPerfil', () => {
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

  it('PUT /api/auth/me com Nome e Email, retorna profile', async () => {
    fetch.mockResolvedValue({
      ok: true, status: 200,
      json: async () => ({ id: 'u1', nome: 'Ana', email: 'ana@x.com', papel: 'Tecnico' }),
    });
    const { result } = renderHook(() => useAtualizarPerfil(), { wrapper });
    result.current.mutate({ Nome: 'Ana', Email: 'ana@x.com' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [url, opts] = fetch.mock.calls[0];
    expect(url).toContain('/api/auth/me');
    expect(opts.method).toBe('PUT');
    expect(JSON.parse(opts.body)).toEqual({ Nome: 'Ana', Email: 'ana@x.com' });
    expect(result.current.data.nome).toBe('Ana');
  });
});
