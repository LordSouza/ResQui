import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FormNovoLab, FormEditarLaboratorio } from '../../src/forms/laboratorios';
import { AuthContext } from '../../src/auth/AuthContext';

let updateUser;

function contexto(user) {
  return function wrapper({ children }) {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    return (
      <QueryClientProvider client={qc}>
        <AuthContext.Provider value={{ user, token: 't', login: vi.fn(), logout: vi.fn(), updateUser }}>
          {children}
        </AuthContext.Provider>
      </QueryClientProvider>
    );
  };
}

const wrapper = contexto({ id: 'u-1', nome: 'Profa. Ana Lima', email: 'ana@x', papel: 'Professor', laboratorioIds: ['Lab-001'] });

const LABS_EXISTENTES = [
  { id: 'Lab-001', cor: '#1465c0', armarios: [], areas: [] },
  { id: 'Lab-002', cor: '#0d4a8c', armarios: [], areas: [] },
];

function rotear(respostaDoPost) {
  return vi.fn(async (url, opts = {}) => {
    if ((opts.method ?? 'GET') === 'GET') return { ok: true, status: 200, json: async () => LABS_EXISTENTES };
    return respostaDoPost;
  });
}

function posts(mockFetch) {
  return mockFetch.mock.calls.filter(([, opts = {}]) => opts.method === 'POST');
}

async function preencherEssencial() {
  await userEvent.type(screen.getByLabelText(/Nome \/ área de atuação/i), 'Lab X');
  await userEvent.type(screen.getByLabelText(/Localização/i), 'Bloco IMC · Sala 12');
}

describe('FormNovoLab — entradas inválidas', () => {
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
    updateUser = vi.fn();
    mockFetch = rotear({ ok: true, status: 201, json: async () => ({ id: 'Lab-009', nome: 'Lab X' }) });
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it('bloqueia cadastro sem nome e localização', async () => {
    render(<FormNovoLab onClose={onClose} dispatch={dispatch} />, { wrapper });
    await userEvent.click(screen.getByRole('button', { name: /Cadastrar laboratório/i }));
    expect(await screen.findByText('Nome e localização são obrigatórios.')).toBeInTheDocument();
    expect(window.alert).not.toHaveBeenCalled();
    expect(posts(mockFetch)).toHaveLength(0);
  });

  it('pede só nome, localização e armários', () => {
    render(<FormNovoLab onClose={onClose} dispatch={dispatch} />, { wrapper });
    expect(screen.getAllByRole('textbox').map(campo => campo.id)).toEqual(['lab-nome', 'lab-sala', 'lab-armarios']);
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('envia o criador como responsável e a cor ainda não usada', async () => {
    render(<FormNovoLab onClose={onClose} dispatch={dispatch} />, { wrapper });
    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/laboratorios'), expect.anything()));
    await preencherEssencial();
    await userEvent.type(screen.getByLabelText('Armários'), 'Armário A');
    await userEvent.click(screen.getByRole('button', { name: /Adicionar/i }));
    await userEvent.type(screen.getByLabelText('Armários'), 'Armário B{Enter}');
    await userEvent.click(screen.getByRole('button', { name: /Cadastrar laboratório/i }));

    await waitFor(() => expect(posts(mockFetch)).toHaveLength(1));
    expect(JSON.parse(posts(mockFetch)[0][1].body)).toEqual({
      Nome: 'Lab X',
      Responsavel: 'Profa. Ana Lima',
      Sala: 'Bloco IMC · Sala 12',
      Armarios: ['Armário A', 'Armário B'],
      Cor: '#1f7a3e',
    });
  });

  it('lista os armários adicionados e remove um deles', async () => {
    render(<FormNovoLab onClose={onClose} dispatch={dispatch} />, { wrapper });
    expect(screen.getByText('Nenhum armário adicionado.')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Armários'), 'Armário A{Enter}');
    await userEvent.type(screen.getByLabelText('Armários'), 'Armário B{Enter}');

    const lista = screen.getByRole('list', { name: 'Armários adicionados' });
    expect(within(lista).getAllByRole('listitem').map(item => item.textContent)).toEqual(['Armário A', 'Armário B']);
    expect(screen.getByLabelText('Armários')).toHaveValue('');

    await userEvent.click(screen.getByRole('button', { name: 'Remover Armário A' }));
    expect(within(lista).getAllByRole('listitem').map(item => item.textContent)).toEqual(['Armário B']);
  });

  it('recusa armário repetido, ignorando maiúsculas', async () => {
    render(<FormNovoLab onClose={onClose} dispatch={dispatch} />, { wrapper });
    await userEvent.type(screen.getByLabelText('Armários'), 'Armário A{Enter}');
    await userEvent.type(screen.getByLabelText('Armários'), 'armário a{Enter}');

    expect(screen.getByText('Esse armário já está na lista.')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });

  it('envia o armário digitado e não adicionado ao cadastrar', async () => {
    render(<FormNovoLab onClose={onClose} dispatch={dispatch} />, { wrapper });
    await preencherEssencial();
    await userEvent.type(screen.getByLabelText('Armários'), 'Armário A{Enter}');
    await userEvent.type(screen.getByLabelText('Armários'), 'Armário B');
    await userEvent.click(screen.getByRole('button', { name: /Cadastrar laboratório/i }));

    await waitFor(() => expect(posts(mockFetch)).toHaveLength(1));
    expect(JSON.parse(posts(mockFetch)[0][1].body).Armarios).toEqual(['Armário A', 'Armário B']);
  });

  it('exibe mensagem de erro do servidor (400 de validação)', async () => {
    mockFetch = rotear({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({ message: 'Nome obrigatório.' }),
    });
    vi.stubGlobal('fetch', mockFetch);
    render(<FormNovoLab onClose={onClose} dispatch={dispatch} />, { wrapper });
    await preencherEssencial();
    await userEvent.click(screen.getByRole('button', { name: /Cadastrar laboratório/i }));
    expect(await screen.findByText('Nome obrigatório.')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('passa a responder pelo laboratório que acabou de criar, sem recarregar', async () => {
    render(<FormNovoLab onClose={onClose} dispatch={dispatch} />, { wrapper });

    await preencherEssencial();
    await userEvent.click(screen.getByRole('button', { name: /Cadastrar laboratório/i }));

    await waitFor(() => expect(updateUser).toHaveBeenCalled());
    expect(updateUser.mock.calls[0][0].laboratorioIds).toEqual(['Lab-001', 'Lab-009']);
  });

  it('Admin não ganha vínculo — ele já atravessa o escopo', async () => {
    render(<FormNovoLab onClose={onClose} dispatch={dispatch} />, {
      wrapper: contexto({ id: 'adm', papel: 'Admin' }),
    });

    await preencherEssencial();
    await userEvent.click(screen.getByRole('button', { name: /Cadastrar laboratório/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(updateUser).not.toHaveBeenCalled();
  });
});

describe('FormEditarLaboratorio', () => {
  let mockFetch;

  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      data: {},
      setItem(k, v) { this.data[k] = String(v); },
      getItem(k) { return this.data[k] ?? null; },
      removeItem(k) { delete this.data[k]; },
      clear() { this.data = {}; },
    });
    mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: 'Lab-001' }) });
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  const lab = { id: 'Lab-001', nome: 'Química', responsavel: 'Profa. Ana', sala: 'Sala 1', armarios: ['A1', 'A2'], cor: '#1465c0' };

  it('edita só nome, localização e armários', async () => {
    render(<FormEditarLaboratorio lab={lab} onClose={vi.fn()} dispatch={vi.fn()} />, { wrapper });
    expect(screen.getAllByRole('textbox').map(campo => campo.id)).toEqual(['edit-lab-nome', 'edit-lab-sala', 'edit-lab-armarios']);

    const localizacao = screen.getByLabelText(/Localização/i);
    await userEvent.clear(localizacao);
    await userEvent.type(localizacao, 'Sala 9');
    await userEvent.click(screen.getByRole('button', { name: 'Remover A1' }));
    await userEvent.type(screen.getByLabelText('Armários'), 'A3{Enter}');
    await userEvent.click(screen.getByRole('button', { name: /Salvar alterações/i }));

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({ Nome: 'Química', Sala: 'Sala 9', Armarios: ['A2', 'A3'] });
  });
});
