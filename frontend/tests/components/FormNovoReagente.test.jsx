import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FormNovoReagente } from '../../src/forms/reagentes';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
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
          { nome: 'Química Orgânica', armarios: ['Inflamáveis'] },
        ] });
      }
      if (String(url) === '/api/usuarios/nomes') {
        return Promise.resolve({ ok: true, status: 200, json: async () => [
          { id: 'u-1', nome: 'Ana Lima', email: 'ana@x.com' },
          { id: 'u-2', nome: 'Zara Nunes', email: 'zara@x.com' },
        ] });
      }
      if (String(url).startsWith('/api/usuarios')) {
        return Promise.resolve({ ok: false, status: 403, text: async () => '' });
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
    await userEvent.click(screen.getByRole('button', { name: /Cadastrar reagente/i }));
    await waitFor(() => expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'refresh' })));
  });

  it('calls onClose on valid submit', async () => {
    render(<FormNovoReagente onClose={onClose} dispatch={dispatch} />, { wrapper });
    await userEvent.type(screen.getByPlaceholderText(/ex: Ácido Acético/i), 'Reagente Teste');
    await userEvent.type(screen.getByPlaceholderText('64-19-7'), '9999-99-9');
    await userEvent.click(screen.getByRole('button', { name: /Cadastrar reagente/i }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('calls onClose when Cancelar is clicked', async () => {
    render(<FormNovoReagente onClose={onClose} dispatch={dispatch} />, { wrapper });
    await userEvent.click(screen.getByRole('button', { name: /Cancelar/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('popula Localização e Responsável a partir da API (sem literais hardcoded)', async () => {
    render(<FormNovoReagente onClose={onClose} dispatch={dispatch} />, { wrapper });
    expect(await screen.findByRole('option', { name: 'Química Orgânica · Inflamáveis' })).toBeInTheDocument();
    expect(await screen.findByRole('option', { name: 'Ana Lima' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Profa. Ana Lima' })).toBeNull();
  });

  it('busca responsáveis no endpoint enxuto, não na listagem restrita a Admin', async () => {
    render(<FormNovoReagente onClose={onClose} dispatch={dispatch} />, { wrapper });
    await screen.findByRole('option', { name: 'Ana Lima' });
    const chamadas = fetch.mock.calls.map(c => String(c[0]));
    expect(chamadas).toContain('/api/usuarios/nomes');
    expect(chamadas.filter(u => u === '/api/usuarios')).toHaveLength(0);
  });

  it('preserva a ordem de responsáveis devolvida pela API', async () => {
    render(<FormNovoReagente onClose={onClose} dispatch={dispatch} />, { wrapper });
    const select = await screen.findByLabelText('Responsável');
    await waitFor(() => expect(select.options.length).toBeGreaterThan(1));
    const nomes = Array.from(select.options).map(o => o.textContent);
    expect(nomes.indexOf('Ana Lima')).toBeLessThan(nomes.indexOf('Zara Nunes'));
  });
});
