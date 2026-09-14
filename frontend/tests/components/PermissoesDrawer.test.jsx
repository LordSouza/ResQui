import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '../../src/auth/AuthContext';
import { PermissoesDrawer } from '../../src/screens/UsuariosScreen';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <AuthContext.Provider value={{ user: { id: 'admin-1', papel: 'Admin' }, token: 't', login: vi.fn(), logout: vi.fn(), updateUser: vi.fn() }}>
        {children}
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

const usuario = { id: 'u1', nome: 'Ana Lima', email: 'ana@lab.com', papel: 'Aluno', status: 'ativo', matricula: 'M001', cor: '#333', iniciais: 'AL' };

describe('PermissoesDrawer — honesto (papel só)', () => {
  let onClose, dispatch, mockFetch;
  beforeEach(() => {
    onClose = vi.fn();
    dispatch = vi.fn();
    vi.stubGlobal('localStorage', {
      data: {}, setItem(k, v) { this.data[k] = String(v); },
      getItem(k) { return this.data[k] ?? null; },
      removeItem(k) { delete this.data[k]; },
      clear() { this.data = {}; },
    });
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it('não renderiza checkboxes editáveis de permissão nem escopo de labs', () => {
    render(<PermissoesDrawer usuario={usuario} onClose={onClose} dispatch={dispatch} />, { wrapper });
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    expect(screen.queryByText('Escopo de laboratórios')).toBeNull();
    expect(screen.queryByText('Permissões efetivas')).toBeNull();
  });

  it('trocar papel e salvar persiste via PUT /api/usuarios/:id/papel', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 204, json: async () => null });
    render(<PermissoesDrawer usuario={usuario} onClose={onClose} dispatch={dispatch} />, { wrapper });

    await userEvent.click(screen.getByRole('radio', { name: /Professor/i }));
    await userEvent.click(screen.getByRole('button', { name: /Salvar alterações/i }));

    expect(mockFetch.mock.calls[0][0]).toBe('/api/usuarios/u1/papel');
    expect(mockFetch.mock.calls[0][1].method).toBe('PUT');
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({ NovoPapel: 'Professor' });
  });

  it('lista as capacidades do papel derivadas das policies, não uma lista própria', () => {
    render(<PermissoesDrawer usuario={usuario} onClose={onClose} dispatch={dispatch} />, { wrapper });

    expect(screen.getByText('Solicitar descarte, registrar baixa de reagente e de lote, transferir reagente')).toBeInTheDocument();
    expect(screen.queryByText('Consultar o log de auditoria')).toBeNull();
  });

  it('não exibe as permissões granulares que não autorizavam nada', () => {
    render(<PermissoesDrawer usuario={usuario} onClose={onClose} dispatch={dispatch} />, { wrapper });

    expect(screen.queryByText('Classificar / rotular')).toBeNull();
    expect(screen.queryByText('Mover entre armários')).toBeNull();
    expect(screen.queryByText(/permissões padrão/)).toBeNull();
  });

  it('oferece exatamente os três papéis do sistema', () => {
    render(<PermissoesDrawer usuario={usuario} onClose={onClose} dispatch={dispatch} />, { wrapper });

    expect(screen.getAllByRole('radio')).toHaveLength(3);
    expect(screen.getByRole('radio', { name: 'Administrador' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Professor' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Aluno' })).toBeInTheDocument();
  });

  // PUT /api/usuarios/:id/papel exige Administracao — o professor lê o drawer mas não altera.
  it('não deixa o Professor alterar papel', () => {
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <AuthContext.Provider value={{ user: { id: 'p-1', papel: 'Professor' }, token: 't', login: vi.fn(), logout: vi.fn(), updateUser: vi.fn() }}>
          <PermissoesDrawer usuario={usuario} onClose={onClose} dispatch={dispatch} />
        </AuthContext.Provider>
      </QueryClientProvider>
    );

    for (const radio of screen.getAllByRole('radio')) expect(radio).toBeDisabled();
    expect(screen.queryByRole('button', { name: /Salvar alterações/i })).toBeNull();
  });
});
