import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PermissoesDrawer } from '../../src/screens/UsuariosScreen';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
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

    expect(screen.getByText('Solicitar descarte, registrar baixa e transferir reagente')).toBeInTheDocument();
    expect(screen.queryByText('Consultar o log de auditoria')).toBeNull();
  });

  it('não exibe as permissões granulares que não autorizavam nada', () => {
    render(<PermissoesDrawer usuario={usuario} onClose={onClose} dispatch={dispatch} />, { wrapper });

    expect(screen.queryByText('Classificar / rotular')).toBeNull();
    expect(screen.queryByText('Mover entre armários')).toBeNull();
    expect(screen.queryByText(/permissões padrão/)).toBeNull();
  });

  it('oferece exatamente os dois papéis do sistema', () => {
    render(<PermissoesDrawer usuario={usuario} onClose={onClose} dispatch={dispatch} />, { wrapper });

    expect(screen.getAllByRole('radio')).toHaveLength(2);
    expect(screen.getByRole('radio', { name: 'Professor' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Aluno' })).toBeInTheDocument();
  });
});
