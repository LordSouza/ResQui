import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FormNovoLab } from '../../src/forms/laboratorios';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
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
    mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it('bloqueia cadastro sem nome e sala', async () => {
    render(<FormNovoLab onClose={onClose} dispatch={dispatch} />, { wrapper });
    await userEvent.click(screen.getByRole('button', { name: /Cadastrar laboratório/i }));
    expect(window.alert).toHaveBeenCalledWith('Nome e número da sala são obrigatórios.');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('exibe mensagem de erro do servidor (400 de validação)', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({ message: 'Capacidade não pode ser negativa.' }),
    });
    render(<FormNovoLab onClose={onClose} dispatch={dispatch} />, { wrapper });
    await userEvent.type(screen.getByLabelText(/Nome \/ área de atuação/i), 'Lab X');
    await userEvent.type(screen.getByLabelText(/Nº da sala/i), '12');
    await userEvent.click(screen.getByRole('button', { name: /Cadastrar laboratório/i }));
    expect(await screen.findByText('Capacidade não pode ser negativa.')).toBeInTheDocument();
  });
});
