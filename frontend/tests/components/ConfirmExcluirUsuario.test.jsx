import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfirmExcluirUsuario } from '../../src/forms/usuarios';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const usuario = { id: 'u1', nome: 'Ana Lima', email: 'ana@lab.com', papel: 'Professor', cor: '#333', iniciais: 'AL' };

describe('ConfirmExcluirUsuario', () => {
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

  it('digitar EXCLUIR e confirmar chama a API e fecha', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 204, json: async () => null });
    render(<ConfirmExcluirUsuario usuario={usuario} onClose={onClose} dispatch={dispatch} />, { wrapper });

    await userEvent.type(screen.getByLabelText(/Digite EXCLUIR/i), 'EXCLUIR');
    await userEvent.click(screen.getByRole('button', { name: /Excluir usuário/i }));

    expect(mockFetch.mock.calls[0][0]).toBe('/api/usuarios/u1/definitivo');
    expect(mockFetch.mock.calls[0][1].method).toBe('DELETE');
    expect(onClose).toHaveBeenCalled();
  });

  it('botão fica desabilitado sem digitar EXCLUIR', () => {
    render(<ConfirmExcluirUsuario usuario={usuario} onClose={onClose} dispatch={dispatch} />, { wrapper });
    expect(screen.getByRole('button', { name: /Excluir usuário/i })).toBeDisabled();
  });
});
