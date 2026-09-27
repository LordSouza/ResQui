import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FormNovoResiduo } from '../../src/forms/residuos';

vi.mock('../../src/auth/AuthContext', () => ({ useAuth: vi.fn() }));
import { useAuth } from '../../src/auth/AuthContext';

const LABS = [{ id: 'Lab-001', nome: 'Lab Teste' }, { id: 'Lab-002', nome: 'Lab Dois' }];

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('FormNovoResiduo — entradas inválidas', () => {
  let onClose, dispatch, mockFetch;

  beforeEach(() => {
    onClose = vi.fn();
    dispatch = vi.fn();
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.stubGlobal('localStorage', {
      data: {},
      setItem(k, v) { this.data[k] = String(v); },
      getItem(k) { return this.data[k] ?? null; },
      removeItem(k) { delete this.data[k]; },
      clear() { this.data = {}; },
    });
    useAuth.mockReturnValue({ user: { id: 'u-1', papel: 'Professor', laboratorioIds: ['Lab-001', 'Lab-002'] } });
    mockFetch = vi.fn().mockImplementation((url) =>
      String(url).startsWith('/api/laboratorios')
        ? Promise.resolve({ ok: true, status: 200, json: async () => LABS })
        : Promise.resolve({ ok: true, status: 200, json: async () => [] }));
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it('submeter vazio mostra erros sob os campos, sem alert', async () => {
    const alertSpy = vi.spyOn(window, 'alert');
    render(<FormNovoResiduo onClose={onClose} dispatch={dispatch} />, { wrapper });
    await userEvent.click(screen.getByLabelText(/^1\./));
    await userEvent.click(screen.getByRole('button', { name: /Registrar resíduo/i }));
    expect(alertSpy).not.toHaveBeenCalled();
    expect(screen.getByText('Informe o volume.')).toBeInTheDocument();
    expect(screen.getByText('Descreva a composição.')).toBeInTheDocument();
    expect(screen.getByText('Selecione o laboratório.')).toBeInTheDocument();
    expect(mockFetch.mock.calls.filter(c => c[1]?.method === 'POST')).toHaveLength(0);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('envia o LaboratorioId como string, sem derivar número por regex', async () => {
    render(<FormNovoResiduo onClose={onClose} dispatch={dispatch} />, { wrapper });
    await screen.findByRole('option', { name: 'Lab Teste' });
    await userEvent.selectOptions(screen.getByLabelText(/Laboratório/i), 'Lab-001');
    await userEvent.type(screen.getByLabelText('Volume'), '2');
    await userEvent.type(screen.getByLabelText(/Composição declarada/i), 'Acetona 70%');
    await userEvent.click(screen.getByRole('button', { name: /Registrar resíduo/i }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    const postCall = mockFetch.mock.calls.find(c => c[1]?.method === 'POST');
    expect(JSON.parse(postCall[1].body)).toMatchObject({ LaboratorioId: 'Lab-001' });
  });

  it('mantém o botão desabilitado enquanto nenhuma classe estiver marcada', async () => {
    render(<FormNovoResiduo onClose={onClose} dispatch={dispatch} />, { wrapper });
    await screen.findByRole('option', { name: 'Lab Teste' });
    const botao = screen.getByRole('button', { name: /Registrar resíduo/i });
    expect(botao).toBeEnabled();
    await userEvent.click(screen.getByLabelText(/5\. Solventes orgânicos/));
    expect(botao).toBeDisabled();
  });

  it('avisa que a classificação alimenta o bloqueio de mistura', async () => {
    render(<FormNovoResiduo onClose={onClose} dispatch={dispatch} />, { wrapper });
    await userEvent.click(screen.getByLabelText(/5\. Solventes orgânicos/));
    expect(screen.getByText(/determina quais misturas o sistema bloqueia/i)).toBeInTheDocument();
  });

  it('nasce com a classe do tipo marcada e pede as dos outros componentes', () => {
    render(<FormNovoResiduo onClose={onClose} dispatch={dispatch} />, { wrapper });
    expect(screen.getByLabelText(/5\. Solventes orgânicos/)).toBeChecked();
    expect(screen.getByText(/Marque também as classes dos outros componentes/i)).toBeInTheDocument();
  });

  it('trocar o tipo troca a classe dele e preserva as marcadas à mão', async () => {
    render(<FormNovoResiduo onClose={onClose} dispatch={dispatch} />, { wrapper });
    await userEvent.click(screen.getByLabelText(/^7\./));
    await userEvent.selectOptions(screen.getByLabelText(/Tipo de resíduo/i), 'Solventes halogenados');
    expect(screen.getByLabelText(/^5\./)).not.toBeChecked();
    expect(screen.getByLabelText(/^6\./)).toBeChecked();
    expect(screen.getByLabelText(/^7\./)).toBeChecked();
  });

  it('tipo sem classe equivalente não marca nenhuma', async () => {
    render(<FormNovoResiduo onClose={onClose} dispatch={dispatch} />, { wrapper });
    await userEvent.selectOptions(screen.getByLabelText(/Tipo de resíduo/i), 'Vidraria contaminada');
    expect(screen.getAllByRole('checkbox').filter(c => c.checked)).toHaveLength(0);
    expect(screen.getByRole('button', { name: /Registrar resíduo/i })).toBeDisabled();
  });

  it('a unidade segue o tipo até ser escolhida à mão', async () => {
    render(<FormNovoResiduo onClose={onClose} dispatch={dispatch} />, { wrapper });
    const unidade = screen.getByLabelText('Unidade de volume');
    expect(unidade).toHaveValue('L');
    await userEvent.selectOptions(screen.getByLabelText(/Tipo de resíduo/i), 'Vidraria contaminada');
    expect(unidade).toHaveValue('kg');
    await userEvent.selectOptions(unidade, 'g');
    await userEvent.selectOptions(screen.getByLabelText(/Tipo de resíduo/i), 'Oxidantes');
    expect(unidade).toHaveValue('g');
  });

  it('unidade vinda do assistente não é trocada pelo tipo', async () => {
    render(<FormNovoResiduo onClose={onClose} dispatch={dispatch} inicial={{ tipo: 'Oxidantes', unidade: 'mL' }} />, { wrapper });
    const unidade = screen.getByLabelText('Unidade de volume');
    await userEvent.selectOptions(screen.getByLabelText(/Tipo de resíduo/i), 'Vidraria contaminada');
    expect(unidade).toHaveValue('mL');
  });

  it('diz que o registro aguarda aprovação, sem prometer rotulagem automática', () => {
    render(<FormNovoResiduo onClose={onClose} dispatch={dispatch} />, { wrapper });
    expect(screen.getByText(/aguarda aprovação antes de ir para a coleta/i)).toBeInTheDocument();
    expect(screen.queryByText(/rotula automaticamente/i)).not.toBeInTheDocument();
  });

  describe('veredito de mistura ao vivo', () => {
    const MATRIZ = {
      entries: [
        { classeA: 1, classeB: 3, nivel: 3 }, { classeA: 3, classeB: 1, nivel: 3 },
        { classeA: 1, classeB: 5, nivel: 1 }, { classeA: 5, classeB: 1, nivel: 1 },
      ],
      fonte: null,
    };

    beforeEach(() => {
      mockFetch.mockImplementation((url) => Promise.resolve({
        ok: true, status: 200,
        json: async () => {
          if (String(url).startsWith('/api/compat/matriz')) return MATRIZ;
          if (String(url).startsWith('/api/laboratorios')) return LABS;
          return [];
        },
      }));
    });

    it('bloqueia o envio e nomeia o par proibido antes de chegar ao servidor', async () => {
      render(<FormNovoResiduo onClose={onClose} dispatch={dispatch} />, { wrapper });
      await userEvent.click(screen.getByLabelText(/^1\./));
      await userEvent.click(await screen.findByLabelText(/^3\./));
      expect(await screen.findByText(/Proibido: 1\. Ácidos inorgânicos × 3\. Bases/)).toBeInTheDocument();
      const botao = screen.getByRole('button', { name: /Registrar resíduo/i });
      expect(botao).toBeDisabled();
      expect(botao).toHaveAccessibleDescription(/o sistema recusa o registro/);
    });

    it('marca como conflitante a classe que o sistema recusaria junto das já marcadas', async () => {
      render(<FormNovoResiduo onClose={onClose} dispatch={dispatch} />, { wrapper });
      await userEvent.click(screen.getByLabelText(/^1\./));
      expect(await screen.findByLabelText(/^3\. Bases \/ álcalis: proibido com as classes marcadas/)).toBeInTheDocument();
    });

    it('aceita mistura em cautela, avisando', async () => {
      render(<FormNovoResiduo onClose={onClose} dispatch={dispatch} />, { wrapper });
      await userEvent.click(screen.getByLabelText(/^1\./));
      expect(await screen.findByText(/Cautela: 1\. Ácidos inorgânicos × 5\. Solventes/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Registrar resíduo/i })).toBeEnabled();
    });
  });

  it('com um único laboratório, preenche o campo e não o oferece como escolha', async () => {
    useAuth.mockReturnValue({ user: { id: 'u-1', papel: 'Professor', laboratorioIds: ['Lab-001'] } });
    render(<FormNovoResiduo onClose={onClose} dispatch={dispatch} />, { wrapper });

    const select = await screen.findByLabelText(/Laboratório/i);
    await waitFor(() => expect(select).toHaveValue('Lab-001'));
    expect(select).toBeDisabled();
  });

  it('sem laboratório atribuído, explica e impede o registro', async () => {
    useAuth.mockReturnValue({ user: { id: 'u-1', papel: 'Aluno', laboratorioIds: [] } });
    render(<FormNovoResiduo onClose={onClose} dispatch={dispatch} />, { wrapper });

    expect(await screen.findByText(/não responde por nenhum laboratório/i)).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText(/5\. Solventes orgânicos/));
    expect(screen.getByRole('button', { name: /Registrar resíduo/i })).toBeDisabled();
  });

  it('descarta laboratório pré-preenchido que não está no escopo do usuário', async () => {
    useAuth.mockReturnValue({ user: { id: 'u-1', papel: 'Professor', laboratorioIds: ['Lab-001', 'Lab-002'] } });
    render(<FormNovoResiduo onClose={onClose} dispatch={dispatch}
      inicial={{ laboratorioId: 'Unifei S.A.' }} />, { wrapper });

    const select = await screen.findByLabelText(/Laboratório/i);
    await waitFor(() => expect(select).toHaveValue(''));
    expect(select).toBeEnabled();
  });
});
