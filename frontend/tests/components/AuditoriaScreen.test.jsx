import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuditoriaScreen } from '../../src/screens/AuditoriaScreen';
import { useAuth } from '../../src/auth/AuthContext';
import { useToast } from '../../src/components/ToastContext';
import { exportCsv } from '../../src/utils';

vi.mock('../../src/auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../../src/components/ToastContext', () => ({ useToast: vi.fn() }));
vi.mock('../../src/utils', async (importOriginal) => ({ ...(await importOriginal()), exportCsv: vi.fn() }));

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
    useAuth.mockReturnValue({ user: { papel: 'Professor' } });
    useToast.mockReturnValue({ addToast: vi.fn() });
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

  function respostas(porRota) {
    fetch.mockImplementation(async (url) => {
      const rota = Object.keys(porRota).find(r => url.startsWith(r) && (url.length === r.length || url[r.length] === '?'));
      const corpo = porRota[rota];
      if (corpo === 204) return { ok: true, status: 204, json: async () => null };
      return { ok: true, status: 200, json: async () => corpo };
    });
  }

  it('descreve a trilha como somente de inclusão, sem prometer imutabilidade', async () => {
    respostas({ '/api/auditoria': [fakeEntry] });

    wrapper(<AuditoriaScreen state={fakeState} dispatch={fakeDispatch} />);

    await waitFor(() => expect(screen.getByText(/somente de inclusão, com encadeamento verificável/)).toBeInTheDocument());
    expect(screen.queryByText(/imutável/)).not.toBeInTheDocument();
  });

  it('Professor não vê a verificação da cadeia', async () => {
    respostas({ '/api/auditoria': [fakeEntry] });

    wrapper(<AuditoriaScreen state={fakeState} dispatch={fakeDispatch} />);

    await waitFor(() => expect(screen.getByText('ana@lab.com')).toBeInTheDocument());
    expect(screen.queryByText('Verificar agora')).not.toBeInTheDocument();
  });

  it('Admin verifica a cadeia e vê o resumo íntegro', async () => {
    useAuth.mockReturnValue({ user: { papel: 'Admin' } });
    respostas({
      '/api/auditoria/verificacao': { integra: true, totalRegistros: 12, ultimaSequencia: 12, ultimoHash: 'ab'.repeat(32), primeiraSequenciaInvalida: null },
      '/api/auditoria': [fakeEntry],
    });

    wrapper(<AuditoriaScreen state={fakeState} dispatch={fakeDispatch} />);
    await waitFor(() => expect(screen.getByText(/ainda não verificada/)).toBeInTheDocument());
    fireEvent.click(screen.getByText('Verificar agora'));

    await waitFor(() => expect(screen.getByText(/Cadeia íntegra · 12 registros · verificado em \d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/)).toBeInTheDocument());
    expect(fetch.mock.calls.some(([url]) => url === '/api/auditoria/verificacao')).toBe(true);
  });

  it('Admin vê alerta com a primeira sequência inválida', async () => {
    useAuth.mockReturnValue({ user: { papel: 'Admin' } });
    respostas({
      '/api/auditoria/verificacao': { integra: false, totalRegistros: 30, ultimaSequencia: 30, ultimoHash: 'cd'.repeat(32), primeiraSequenciaInvalida: 17 },
      '/api/auditoria': [fakeEntry],
    });

    wrapper(<AuditoriaScreen state={fakeState} dispatch={fakeDispatch} />);
    await waitFor(() => expect(screen.getByText('Verificar agora')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Verificar agora'));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Cadeia violada a partir da sequência 17 · 30 registros'));
  });

  it('exportação CSV termina com a âncora da auditoria', async () => {
    respostas({
      '/api/auditoria/ancora': { ultimaSequencia: 321, ultimoHash: '0123456789abcdef'.repeat(4), prefixoHash: '0123456789abcdef' },
      '/api/auditoria': [fakeEntry],
    });

    wrapper(<AuditoriaScreen state={fakeState} dispatch={fakeDispatch} />);
    await waitFor(() => expect(screen.getByText(/Exportar CSV/i)).toBeInTheDocument());
    fireEvent.click(screen.getByText(/Exportar CSV/i));

    await waitFor(() => expect(exportCsv).toHaveBeenCalled());
    const linhas = exportCsv.mock.calls.at(-1)[0];
    expect(linhas.at(-1)).toEqual(['Âncora da auditoria', 'seq. 321', 'hash 0123456789abcdef']);
  });

  it('exportação CSV é cancelada com aviso quando a âncora falha', async () => {
    const addToast = vi.fn();
    useToast.mockReturnValue({ addToast });
    exportCsv.mockClear();
    fetch.mockImplementation(async (url) => url.startsWith('/api/auditoria/ancora')
      ? { ok: false, status: 500, text: async () => '' }
      : { ok: true, status: 200, json: async () => [fakeEntry] });

    wrapper(<AuditoriaScreen state={fakeState} dispatch={fakeDispatch} />);
    await waitFor(() => expect(screen.getByText(/Exportar CSV/i)).toBeInTheDocument());
    fireEvent.click(screen.getByText(/Exportar CSV/i));

    await waitFor(() => expect(addToast).toHaveBeenCalledWith(expect.stringContaining('Exportação cancelada')));
    expect(exportCsv).not.toHaveBeenCalled();
  });
});
