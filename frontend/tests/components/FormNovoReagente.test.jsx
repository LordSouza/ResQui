import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FormNovoReagente } from '../../src/forms/reagentes';

vi.mock('../../src/auth/AuthContext', () => ({ useAuth: () => ({ user: { papel: 'Admin' } }) }));

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

async function escolherLaboratorio() {
  await screen.findByRole('option', { name: 'Química Orgânica' });
  await userEvent.selectOptions(screen.getByLabelText('Laboratório'), 'Lab-001');
}

describe('FormNovoReagente', () => {
  let onClose;
  let dispatch;

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
    vi.stubGlobal('fetch', vi.fn((url) => {
      if (String(url).startsWith('/api/laboratorios')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => [
          { id: 'Lab-001', nome: 'Química Orgânica', armarios: ['Inflamáveis'] },
        ] });
      }
      return Promise.resolve({ ok: true, status: 201, json: async () => ({ id: 'R-999' }) });
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders the form title', () => {
    render(<FormNovoReagente onClose={onClose} dispatch={dispatch} />, { wrapper });
    expect(screen.getByText('Novo reagente')).toBeInTheDocument();
  });

  it('submeter sem nome e CAS mostra erros inline, sem alert', async () => {
    const alertSpy = vi.spyOn(window, 'alert');
    render(<FormNovoReagente onClose={onClose} dispatch={dispatch} />, { wrapper });
    await userEvent.click(screen.getByRole('button', { name: /Cadastrar reagente/i }));
    expect(alertSpy).not.toHaveBeenCalled();
    expect(screen.getByText('Informe o nome do reagente.')).toBeInTheDocument();
    expect(screen.getByText('Informe o número CAS.')).toBeInTheDocument();
  });

  it('agrupa o formulário em seções nomeadas', () => {
    render(<FormNovoReagente onClose={onClose} dispatch={dispatch} />, { wrapper });
    expect(screen.getByText('Identificação')).toBeInTheDocument();
    expect(screen.getByText('Estoque e localização')).toBeInTheDocument();
    expect(screen.getByText(/Classificação GHS/)).toBeInTheDocument();
  });

  it('não fecha o modal quando a validação falha', async () => {
    render(<FormNovoReagente onClose={onClose} dispatch={dispatch} />, { wrapper });
    await userEvent.click(screen.getByRole('button', { name: /Cadastrar reagente/i }));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not dispatch when validation fails', async () => {
    render(<FormNovoReagente onClose={onClose} dispatch={dispatch} />, { wrapper });
    await userEvent.click(screen.getByRole('button', { name: /Cadastrar reagente/i }));
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('calls dispatch with refresh action on valid submit', async () => {
    render(<FormNovoReagente onClose={onClose} dispatch={dispatch} />, { wrapper });
    await userEvent.type(screen.getByPlaceholderText(/ex: Ácido Acético/i), 'Reagente Teste');
    await userEvent.type(screen.getByPlaceholderText('64-19-7'), '9999-99-9');
    await escolherLaboratorio();
    await userEvent.click(screen.getByRole('button', { name: /Cadastrar reagente/i }));
    await waitFor(() => expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'refresh' })));
  });

  it('calls onClose on valid submit', async () => {
    render(<FormNovoReagente onClose={onClose} dispatch={dispatch} />, { wrapper });
    await userEvent.type(screen.getByPlaceholderText(/ex: Ácido Acético/i), 'Reagente Teste');
    await userEvent.type(screen.getByPlaceholderText('64-19-7'), '9999-99-9');
    await escolherLaboratorio();
    await userEvent.click(screen.getByRole('button', { name: /Cadastrar reagente/i }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('calls onClose when Cancelar is clicked', async () => {
    render(<FormNovoReagente onClose={onClose} dispatch={dispatch} />, { wrapper });
    await userEvent.click(screen.getByRole('button', { name: /Cancelar/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('envia o laboratório e o armário escolhidos, com o armário único já marcado', async () => {
    render(<FormNovoReagente onClose={onClose} dispatch={dispatch} />, { wrapper });
    await userEvent.type(screen.getByPlaceholderText(/ex: Ácido Acético/i), 'Reagente Teste');
    await userEvent.type(screen.getByPlaceholderText('64-19-7'), '9999-99-9');
    await escolherLaboratorio();
    expect(screen.getByLabelText('Armário')).toHaveValue('Inflamáveis');
    await userEvent.click(screen.getByRole('button', { name: /Cadastrar reagente/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    const post = fetch.mock.calls.find(c => c[1]?.method === 'POST');
    expect(JSON.parse(post[1].body)).toMatchObject({ LaboratorioId: 'Lab-001', Armario: 'Inflamáveis' });
  });

  it('sem laboratório mostra erro inline e não envia', async () => {
    render(<FormNovoReagente onClose={onClose} dispatch={dispatch} />, { wrapper });
    await userEvent.type(screen.getByPlaceholderText(/ex: Ácido Acético/i), 'Reagente Teste');
    await userEvent.type(screen.getByPlaceholderText('64-19-7'), '9999-99-9');
    await userEvent.click(screen.getByRole('button', { name: /Cadastrar reagente/i }));

    expect(screen.getByText('Escolha o laboratório.')).toBeInTheDocument();
    expect(fetch.mock.calls.find(c => c[1]?.method === 'POST')).toBeUndefined();
  });

  it('popula os laboratórios a partir da API e não pede responsável', async () => {
    render(<FormNovoReagente onClose={onClose} dispatch={dispatch} />, { wrapper });
    expect(await screen.findByRole('option', { name: 'Química Orgânica' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Responsável')).toBeNull();
    expect(fetch.mock.calls.map(c => String(c[0])).filter(u => u.startsWith('/api/usuarios'))).toHaveLength(0);
  });
});
