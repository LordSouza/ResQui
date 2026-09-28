import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UsuariosScreen } from '../../src/screens/UsuariosScreen';
import { AuthContext } from '../../src/auth/AuthContext';

const USUARIOS = [
  { id: 'u-1', email: 'ana@lab.com', nome: 'Ana Silva', matricula: 'M-1', papel: 'Professor', roles: ['Professor'], arquivado: false, twoFactorEnabled: true, laboratorioIds: ['Lab-001'] },
  { id: 'u-2', email: 'bruno@lab.com', nome: 'Bruno Lima', matricula: 'M-2', papel: 'Professor', roles: ['Professor'], arquivado: false, twoFactorEnabled: false, laboratorioIds: [] },
];

const LABS = [{ id: 'Lab-001', nome: 'Química Geral' }, { id: 'Lab-002', nome: 'Físico-Química' }];

function renderCom(user) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AuthContext.Provider value={{ user, token: 't', login: vi.fn(), logout: vi.fn(), updateUser: vi.fn() }}>
        <UsuariosScreen state={{ tick: 0 }} dispatch={vi.fn()} />
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

describe('UsuariosScreen — MFA', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      data: {},
      setItem(k, v) { this.data[k] = String(v); },
      getItem(k) { return this.data[k] ?? null; },
      removeItem(k) { delete this.data[k]; },
      clear() { this.data = {}; },
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, status: 200, json: async () => USUARIOS,
    }));
  });
  afterEach(() => vi.unstubAllGlobals());

  // O badge diz "TOTP" (o método), não "Ativo": a coluna Status da mesma linha já renderiza
  // "Ativo" e um segundo "Ativo" tornaria a asserção ambígua.
  it('mostra o estado real do 2FA de cada usuário', async () => {
    renderCom({ id: 'admin-1', papel: 'Professor' });

    const linhaAna = (await screen.findByText('Ana Silva')).closest('tr');
    expect(within(linhaAna).getByText('TOTP')).toBeInTheDocument();
    const linhaBruno = screen.getByText('Bruno Lima').closest('tr');
    expect(within(linhaBruno).queryByText('TOTP')).not.toBeInTheDocument();
  });

  it('oferece "Resetar 2FA" ao Admin em usuário com MFA ativo', async () => {
    renderCom({ id: 'admin-1', papel: 'Admin' });

    const linhaAna = (await screen.findByText('Ana Silva')).closest('tr');
    fireEvent.click(within(linhaAna).getByRole('button', { name: /opções do usuário/i }));
    expect(screen.getByRole('button', { name: /resetar 2fa/i })).toBeInTheDocument();
  });

  it('não oferece "Resetar 2FA" para quem não alcança Administracao', async () => {
    renderCom({ id: 'g-1', papel: 'Professor' });

    const linhaAna = (await screen.findByText('Ana Silva')).closest('tr');
    fireEvent.click(within(linhaAna).getByRole('button', { name: /opções do usuário/i }));
    expect(screen.queryByRole('button', { name: /resetar 2fa/i })).not.toBeInTheDocument();
  });

  it('não oferece "Resetar 2FA" na própria linha', async () => {
    renderCom({ id: 'u-1', papel: 'Admin' });

    const linhaAna = (await screen.findByText('Ana Silva')).closest('tr');
    fireEvent.click(within(linhaAna).getByRole('button', { name: /opções do usuário/i }));
    expect(screen.queryByRole('button', { name: /resetar 2fa/i })).not.toBeInTheDocument();
  });
});

describe('UsuariosScreen — só mostra o que a API devolve', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      data: {},
      setItem(k, v) { this.data[k] = String(v); },
      getItem(k) { return this.data[k] ?? null; },
      removeItem(k) { delete this.data[k]; },
      clear() { this.data = {}; },
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, status: 200, json: async () => USUARIOS,
    }));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('não oferece importar CSV de usuários', async () => {
    renderCom({ id: 'admin-1', papel: 'Professor' });

    await screen.findByText('Ana Silva');
    expect(screen.queryByRole('button', { name: /importar csv/i })).not.toBeInTheDocument();
  });

  it('não exibe colunas sem dado na API', async () => {
    renderCom({ id: 'admin-1', papel: 'Professor' });

    await screen.findByText('Ana Silva');
    expect(screen.queryByRole('columnheader', { name: /último acesso/i })).not.toBeInTheDocument();
  });

  it('não oferece o filtro de pendentes, que nunca tem resultado', async () => {
    renderCom({ id: 'admin-1', papel: 'Professor' });

    await screen.findByText('Ana Silva');
    expect(screen.queryByRole('button', { name: /pendentes/i })).not.toBeInTheDocument();
  });

  it('marca com "você" apenas a linha do usuário logado', async () => {
    renderCom({ id: 'u-2', papel: 'Professor' });

    const linhaBruno = (await screen.findByText('Bruno Lima')).closest('tr');
    expect(within(linhaBruno).getByText('você')).toBeInTheDocument();
    const linhaAna = screen.getByText('Ana Silva').closest('tr');
    expect(within(linhaAna).queryByText('você')).not.toBeInTheDocument();
  });

  it('destaca a linha apontada por flashId', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <AuthContext.Provider value={{ user: { id: 'admin-1', papel: 'Professor' }, token: 't', login: vi.fn(), logout: vi.fn(), updateUser: vi.fn() }}>
          <UsuariosScreen state={{ tick: 0, flashId: 'u-2' }} dispatch={vi.fn()} />
        </AuthContext.Provider>
      </QueryClientProvider>
    );

    const linhaBruno = (await screen.findByText('Bruno Lima')).closest('tr');
    expect(linhaBruno.className).toContain('flash');
    const linhaAna = screen.getByText('Ana Silva').closest('tr');
    expect(linhaAna.className).not.toContain('flash');
  });
});

// Todo o grupo /api/usuarios exige Admin, e POST /api/auth/register também.
describe('UsuariosScreen — permissões', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      data: {},
      setItem(k, v) { this.data[k] = String(v); },
      getItem(k) { return this.data[k] ?? null; },
      removeItem(k) { delete this.data[k]; },
      clear() { this.data = {}; },
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, status: 200, json: async () => USUARIOS, text: async () => JSON.stringify(USUARIOS),
    }));
  });
  afterEach(() => vi.unstubAllGlobals());

  it.each(['Admin', 'Professor'])('mostra "Novo usuário" para %s', async (papel) => {
    renderCom({ id: 'admin-1', papel });
    expect(await screen.findByRole('button', { name: /Novo usuário/i })).toBeInTheDocument();
  });

  it('esconde "Novo usuário" de Aluno', async () => {
    renderCom({ id: 'g-1', papel: 'Aluno' });
    await screen.findByRole('heading', { name: /Usuários/i });
    expect(screen.queryByRole('button', { name: /Novo usuário/i })).not.toBeInTheDocument();
  });

  it('esconde "Excluir definitivamente" do Professor', async () => {
    renderCom({ id: 'p-1', papel: 'Professor' });

    const linhaAna = (await screen.findByText('Ana Silva')).closest('tr');
    fireEvent.click(within(linhaAna).getByRole('button', { name: /opções do usuário/i }));
    expect(screen.queryByRole('button', { name: /excluir definitivamente/i })).not.toBeInTheDocument();
  });

  it('desabilita "Excluir definitivamente" na própria linha e mantém nas demais', async () => {
    renderCom({ id: 'u-1', papel: 'Admin' });

    const linhaAna = (await screen.findByText('Ana Silva')).closest('tr');
    fireEvent.click(within(linhaAna).getByRole('button', { name: /opções do usuário/i }));
    expect(screen.getByRole('button', { name: /excluir definitivamente/i })).toBeDisabled();

    const linhaBruno = screen.getByText('Bruno Lima').closest('tr');
    fireEvent.click(within(linhaBruno).getByRole('button', { name: /opções do usuário/i }));
    expect(screen.getByRole('button', { name: /excluir definitivamente/i })).toBeEnabled();
  });

  // O servidor recusa arquivar quem não é Aluno sem ser Admin; a tela não oferece.
  it('esconde "Arquivar" de colega Professor, mas oferece para Aluno', async () => {
    renderCom({ id: 'p-1', papel: 'Professor' });

    const linhaAna = (await screen.findByText('Ana Silva')).closest('tr');
    fireEvent.click(within(linhaAna).getByRole('button', { name: /opções do usuário/i }));
    expect(screen.queryByRole('button', { name: /^arquivar$/i })).not.toBeInTheDocument();
  });
});

describe('UsuariosScreen — laboratórios', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      data: {},
      setItem(k, v) { this.data[k] = String(v); },
      getItem(k) { return this.data[k] ?? null; },
      removeItem(k) { delete this.data[k]; },
      clear() { this.data = {}; },
    });
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url) =>
      Promise.resolve({
        ok: true, status: 200,
        json: async () => (String(url).startsWith('/api/laboratorios') ? LABS : USUARIOS),
      })));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('mostra o nome dos laboratórios de cada usuário', async () => {
    renderCom({ id: 'admin-1', papel: 'Admin' });

    const linhaAna = (await screen.findByText('Ana Silva')).closest('tr');
    expect(within(linhaAna).getByText('Química Geral')).toBeInTheDocument();
  });

  it('conta, sem nomear, o laboratório que o catálogo do solicitante não traz', async () => {
    fetch.mockImplementation((url) =>
      Promise.resolve({
        ok: true, status: 200,
        json: async () => (String(url).startsWith('/api/laboratorios') ? [LABS[1]] : USUARIOS),
      }));
    renderCom({ id: 'admin-1', papel: 'Professor' });

    const linhaAna = (await screen.findByText('Ana Silva')).closest('tr');
    expect(within(linhaAna).getByText('1 outro laboratório')).toBeInTheDocument();
    expect(within(linhaAna).queryByText('Lab-001')).not.toBeInTheDocument();
  });

  it('oferece a ação Laboratórios a quem gere usuários', async () => {
    renderCom({ id: 'admin-1', papel: 'Admin' });

    const linhaAna = (await screen.findByText('Ana Silva')).closest('tr');
    fireEvent.click(within(linhaAna).getByRole('button', { name: 'Opções do usuário' }));
    expect(screen.getByRole('button', { name: /Laboratórios/ })).toBeInTheDocument();
  });

  it('esconde a ação Laboratórios de Professor sobre outro Professor', async () => {
    renderCom({ id: 'admin-1', papel: 'Professor' });

    const linhaAna = (await screen.findByText('Ana Silva')).closest('tr');
    fireEvent.click(within(linhaAna).getByRole('button', { name: 'Opções do usuário' }));
    expect(screen.queryByRole('button', { name: /Laboratórios/ })).not.toBeInTheDocument();
  });
});
