import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuditoriaScreen } from '../../src/screens/AuditoriaScreen';

function wrapper(ui) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

const fakeDispatch = vi.fn();
const fakeState = {};

const fakeEntry = {
  id: 'aaa-bbb',
  timestamp: '2026-05-25T20:00:00Z',
  ts: '2026-05-25T20:00:00Z',
  who: 'ana@lab.com',
  what: 'reagente.criar',
  where: 'Inventário',
  detail: 'Criou R-001',
  risk: 'low',
};

describe('AuditoriaScreen', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      data: { token: 'fake-jwt' },
      setItem(k, v) { this.data[k] = String(v); },
      getItem(k) { return this.data[k] ?? null; },
      removeItem(k) { delete this.data[k]; },
      clear() { this.data = {}; },
    });
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => vi.unstubAllGlobals());

  it('mostra estado de loading', () => {
    fetch.mockReturnValue(new Promise(() => {}));

    wrapper(<AuditoriaScreen state={fakeState} dispatch={fakeDispatch} />);

    expect(screen.getByText(/Carregando/i)).toBeInTheDocument();
  });

  it('renderiza tabela com dados da API', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => [fakeEntry] });

    wrapper(<AuditoriaScreen state={fakeState} dispatch={fakeDispatch} />);

    await waitFor(() => expect(screen.getByText('ana@lab.com')).toBeInTheDocument());
    expect(screen.getByText('reagente.criar')).toBeInTheDocument();
  });

  it('mostra estado de erro com botão tentar novamente', async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });

    wrapper(<AuditoriaScreen state={fakeState} dispatch={fakeDispatch} />);

    await waitFor(() => expect(screen.getByText(/Tentar novamente/i)).toBeInTheDocument());
  });

  it('botão Exportar CSV existe', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => [fakeEntry] });

    wrapper(<AuditoriaScreen state={fakeState} dispatch={fakeDispatch} />);

    await waitFor(() => expect(screen.getByText(/Exportar CSV/i)).toBeInTheDocument());
  });
});
