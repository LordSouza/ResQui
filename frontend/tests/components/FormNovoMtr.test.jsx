import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FormNovoMtr } from '../../src/forms/residuos';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('FormNovoMtr — entradas inválidas', () => {
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

  it('bloqueia criação sem resíduos selecionados', async () => {
    render(<FormNovoMtr onClose={onClose} dispatch={dispatch} />, { wrapper });
    await userEvent.click(screen.getByRole('button', { name: /Emitir manifesto/i }));
    expect(window.alert).toHaveBeenCalledWith('Selecione ao menos um resíduo.');
    expect(mockFetch.mock.calls.filter(c => c[1]?.method === 'POST')).toHaveLength(0);
  });

  it('usa os padrões da configuração PGRS', async () => {
    mockFetch.mockImplementation((url) => {
      if (String(url).includes('/api/pgrs-config')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({
          geradorPadrao: 'Instituição Teste', transportadorPadrao: 'Transportadora Teste',
          destinadorPadrao: 'Destinadora Teste', codigoIbamaPadrao: 'B123',
        })});
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => [] });
    });

    render(<FormNovoMtr onClose={onClose} dispatch={dispatch} />, { wrapper });

    await screen.findByDisplayValue('Instituição Teste');
    expect(screen.getByLabelText(/Transportador/i)).toHaveValue('Transportadora Teste');
    expect(screen.getByLabelText(/Destinador/i)).toHaveValue('Destinadora Teste');
    expect(screen.getByLabelText(/Código IBAMA/i)).toHaveValue('B123');
  });

  it('sem configuração, nasce com campos vazios e sem valores inventados', async () => {
    render(<FormNovoMtr onClose={onClose} dispatch={dispatch} />, { wrapper });

    await screen.findByLabelText(/Gerador/i);
    expect(screen.getByLabelText(/Gerador/i)).toHaveValue('');
    expect(screen.getByLabelText(/Transportador/i)).toHaveValue('');
    expect(document.body.textContent).not.toMatch(/EcoLog|EcoQuímica|CleanWaste|Resitec/i);
  });

  it('bloqueia criação sem gerador/transportador preenchidos, mesmo com resíduo selecionado', async () => {
    mockFetch.mockImplementation((url) => {
      if (String(url).includes('/api/pgrs-config')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
      }
      if (String(url).includes('/api/residuos')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => ([
          { id: 1, tipo: 'Solventes orgânicos não-halogenados', volume: 2, unidade: 'L' },
        ]) });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => [] });
    });

    render(<FormNovoMtr onClose={onClose} dispatch={dispatch} />, { wrapper });

    const checkbox = await screen.findByRole('checkbox');
    await userEvent.click(checkbox);
    expect(screen.getByLabelText(/Gerador/i)).toHaveValue('');
    expect(screen.getByLabelText(/Transportador/i)).toHaveValue('');

    await userEvent.click(screen.getByRole('button', { name: /Emitir manifesto/i }));
    expect(window.alert).toHaveBeenCalledWith('Informe gerador e transportador.');
    expect(mockFetch.mock.calls.filter(c => c[1]?.method === 'POST')).toHaveLength(0);
  });

  it('somatório dos selecionados separa litros de quilos', async () => {
    mockFetch.mockImplementation((url) => {
      if (String(url).includes('/api/pgrs-config')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
      }
      if (String(url).includes('/api/residuos')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => ([
          { id: 1, tipo: 'Solventes orgânicos não-halogenados', volume: 5, unidade: 'L' },
          { id: 2, tipo: 'Vidraria contaminada', volume: 2, unidade: 'kg' },
        ]) });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => [] });
    });

    render(<FormNovoMtr onClose={onClose} dispatch={dispatch} />, { wrapper });

    for (const checkbox of await screen.findAllByRole('checkbox')) await userEvent.click(checkbox);

    expect(screen.getByText(/5\.00 L · 2\.00 kg/)).toBeInTheDocument();
  });
});
