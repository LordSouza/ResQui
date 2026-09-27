import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '../../src/auth/AuthContext';
import { FormNovoUsuario } from '../../src/forms/usuarios';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <AuthContext.Provider value={{ user: { id: 'admin-1', papel: 'Admin', laboratorioIds: [] }, token: 't', login: vi.fn(), logout: vi.fn(), updateUser: vi.fn() }}>
        {children}
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

describe('FormNovoUsuario — entradas inválidas', () => {
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
    mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => [] });
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it('bloqueia criação com nome, e-mail e senha vazios', async () => {
    render(<FormNovoUsuario onClose={onClose} dispatch={dispatch} />, { wrapper });
    await userEvent.click(screen.getByRole('button', { name: /Criar usuário/i }));
    expect(await screen.findByText('Nome, e-mail e senha são obrigatórios.')).toBeInTheDocument();
    expect(window.alert).not.toHaveBeenCalled();
    expect(mockFetch.mock.calls.filter(c => c[1]?.method === 'POST')).toHaveLength(0);
  });

  it('exibe mensagem de erro do servidor para e-mail inválido', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({ message: 'E-mail inválido.' }),
    });
    render(<FormNovoUsuario onClose={onClose} dispatch={dispatch} />, { wrapper });
    await userEvent.type(screen.getByLabelText(/Nome completo/i), 'Ana');
    await userEvent.type(screen.getByLabelText(/E-mail/i), 'sem-arroba');
    await userEvent.type(screen.getByLabelText(/^Senha/i), 'Senha@123');
    await userEvent.click(screen.getByRole('button', { name: /Criar usuário/i }));
    expect(await screen.findByText('E-mail inválido.')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});
