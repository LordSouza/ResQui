import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FormNovoChamado } from '../../src/forms/chamados';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('FormNovoChamado — entradas inválidas', () => {
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

  it('bloqueia abertura sem título e descrição', async () => {
    render(<FormNovoChamado onClose={onClose} dispatch={dispatch} />, { wrapper });
    await userEvent.click(screen.getByRole('button', { name: /Abrir chamado/i }));
    expect(window.alert).toHaveBeenCalledWith('Título e descrição são obrigatórios.');
    expect(mockFetch.mock.calls.filter(c => c[1]?.method === 'POST')).toHaveLength(0);
  });

  it('envia LaboratorioId null quando nenhum laboratório é selecionado', async () => {
    render(<FormNovoChamado onClose={onClose} dispatch={dispatch} />, { wrapper });
    await userEvent.type(screen.getByLabelText(/Título/i), 'Bug no login');
    await userEvent.type(screen.getByLabelText(/Descrição/i), 'Erro ao autenticar com 2FA.');
    await userEvent.click(screen.getByRole('button', { name: /Abrir chamado/i }));
    await waitFor(() => expect(dispatch).toHaveBeenCalledWith({ type: 'refresh' }));
    const postCall = mockFetch.mock.calls.find(c => c[1]?.method === 'POST');
    expect(JSON.parse(postCall[1].body)).toMatchObject({ LaboratorioId: null });
  });

  it('envia o LaboratorioId como string do laboratório selecionado', async () => {
    mockFetch.mockImplementation((url) => {
      if (String(url).startsWith('/api/laboratorios')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => [{ id: 'Lab-001', nome: 'Lab Teste' }] });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
    });
    render(<FormNovoChamado onClose={onClose} dispatch={dispatch} />, { wrapper });
    await screen.findByRole('option', { name: 'Lab Teste' });
    await userEvent.selectOptions(screen.getByLabelText(/Laboratório/i), 'Lab-001');
    await userEvent.type(screen.getByLabelText(/Título/i), 'Bug no login');
    await userEvent.type(screen.getByLabelText(/Descrição/i), 'Erro ao autenticar com 2FA.');
    await userEvent.click(screen.getByRole('button', { name: /Abrir chamado/i }));
    await waitFor(() => expect(dispatch).toHaveBeenCalledWith({ type: 'refresh' }));
    const postCall = mockFetch.mock.calls.find(c => c[1]?.method === 'POST');
    expect(JSON.parse(postCall[1].body)).toMatchObject({ LaboratorioId: 'Lab-001' });
  });
});
