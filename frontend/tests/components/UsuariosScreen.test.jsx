import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UsuariosScreen } from '../../src/screens/UsuariosScreen';
import { AuthContext } from '../../src/auth/AuthContext';

const USUARIOS = [
  { id: 'u-1', email: 'ana@lab.com', nome: 'Ana Silva', matricula: 'M-1', papel: 'Gestor', roles: ['Gestor'], arquivado: false, twoFactorEnabled: true },
  { id: 'u-2', email: 'bruno@lab.com', nome: 'Bruno Lima', matricula: 'M-2', papel: 'Tecnico', roles: ['Tecnico'], arquivado: false, twoFactorEnabled: false },
];

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
    renderCom({ id: 'admin-1', papel: 'Admin' });

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

  it('não oferece "Resetar 2FA" para quem não é Admin', async () => {
    renderCom({ id: 'g-1', papel: 'Gestor' });

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
    renderCom({ id: 'admin-1', papel: 'Admin' });

    await screen.findByText('Ana Silva');
    expect(screen.queryByRole('button', { name: /importar csv/i })).not.toBeInTheDocument();
  });

  it('não exibe colunas sem dado na API', async () => {
    renderCom({ id: 'admin-1', papel: 'Admin' });

    await screen.findByText('Ana Silva');
    expect(screen.queryByRole('columnheader', { name: /laboratórios/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: /último acesso/i })).not.toBeInTheDocument();
  });

  it('não oferece o filtro de pendentes, que nunca tem resultado', async () => {
    renderCom({ id: 'admin-1', papel: 'Admin' });

    await screen.findByText('Ana Silva');
    expect(screen.queryByRole('button', { name: /pendentes/i })).not.toBeInTheDocument();
  });

  it('marca com "você" apenas a linha do usuário logado', async () => {
    renderCom({ id: 'u-2', papel: 'Admin' });

    const linhaBruno = (await screen.findByText('Bruno Lima')).closest('tr');
    expect(within(linhaBruno).getByText('você')).toBeInTheDocument();
    const linhaAna = screen.getByText('Ana Silva').closest('tr');
    expect(within(linhaAna).queryByText('você')).not.toBeInTheDocument();
  });

  it('destaca a linha apontada por flashId', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <AuthContext.Provider value={{ user: { id: 'admin-1', papel: 'Admin' }, token: 't', login: vi.fn(), logout: vi.fn(), updateUser: vi.fn() }}>
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
