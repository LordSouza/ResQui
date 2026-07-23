import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useLocais } from '../../../src/laboratorios/useLocais';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useLocais', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      data: {},
      setItem(k, v) { this.data[k] = String(v); },
      getItem(k) { return this.data[k] ?? null; },
      removeItem(k) { delete this.data[k]; },
      clear() { this.data = {}; },
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('deriva "lab · armário" e usa fallback para lab sem armários', async () => {
    const labs = [
      { nome: 'Química Orgânica', armarios: ['Inflamáveis', 'Ácidos'] },
      { nome: 'Sala Limpa', armarios: [] },
    ];
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, status: 200, json: async () => labs })));

    const { result } = renderHook(() => useLocais(), { wrapper });

    await waitFor(() => expect(result.current.locais).toEqual([
      'Química Orgânica · Inflamáveis',
      'Química Orgânica · Ácidos',
      'Sala Limpa',
    ]));
  });
});
