import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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
    expect(screen.getAllByText('reagente.criar').length).toBeGreaterThan(0);
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

  const agora = new Date().toISOString();
  const entradaLow = { ...fakeEntry, timestamp: agora, ts: agora };
  const entradaMedium = {
    ...fakeEntry, id: 'ccc-ddd', who: 'bruno@lab.com', what: 'residuo.aprovar',
    where: 'Resíduos', detail: 'Aprovou resíduo 7', risk: 'medium', timestamp: agora, ts: agora,
  };

  async function abrirFiltrosAvancados() {
    fetch.mockResolvedValue({ ok: true, json: async () => [entradaLow, entradaMedium] });
    wrapper(<AuditoriaScreen state={fakeState} dispatch={fakeDispatch} />);
    await waitFor(() => expect(screen.getByText('bruno@lab.com')).toBeInTheDocument());
    fireEvent.click(screen.getByText(/Filtros avançados/i));
  }

  it('filtrar por risco Médio mantém os eventos medium da API', async () => {
    await abrirFiltrosAvancados();

    fireEvent.click(screen.getByLabelText('Médio (atenção)'));
    fireEvent.click(screen.getByText('Aplicar'));

    await waitFor(() => expect(screen.getByText('bruno@lab.com')).toBeInTheDocument());
    expect(screen.queryByText('ana@lab.com')).not.toBeInTheDocument();
  });

  it('com dois usuários selecionados não restringe a consulta ao primeiro', async () => {
    await abrirFiltrosAvancados();

    fireEvent.click(screen.getByLabelText('Filtrar por usuário ana@lab.com'));
    fireEvent.click(screen.getByLabelText('Filtrar por usuário bruno@lab.com'));
    fireEvent.click(screen.getByText('Aplicar'));

    await waitFor(() => expect(screen.getByText('bruno@lab.com')).toBeInTheDocument());
    expect(screen.getByText('ana@lab.com')).toBeInTheDocument();
    const ultimaUrl = fetch.mock.calls.at(-1)[0];
    expect(ultimaUrl).not.toContain('who=');
  });

  it('categoria Resíduos casa com os eventos residuo.* reais', async () => {
    await abrirFiltrosAvancados();

    fireEvent.click(screen.getByLabelText('Resíduos'));
    fireEvent.click(screen.getByText('Aplicar'));

    await waitFor(() => expect(screen.getByText('bruno@lab.com')).toBeInTheDocument());
    expect(screen.queryByText('ana@lab.com')).not.toBeInTheDocument();
  });
});
