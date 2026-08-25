import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FormBaixa } from '../../src/forms/reagentes';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('FormBaixa', () => {
  let onClose;
  let dispatch;
  let reagente;

  beforeEach(() => {
    onClose = vi.fn();
    dispatch = vi.fn();
    reagente = {
      id: 'R-TEST',
      nome: 'Reagente Teste',
      estoque: 5.0,
      unidade: 'L',
      local: 'Lab-201 · Armário A · Pra. 1',
    };
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.stubGlobal('localStorage', {
      data: {},
      setItem(k, v) { this.data[k] = String(v); },
      getItem(k) { return this.data[k] ?? null; },
      removeItem(k) { delete this.data[k]; },
      clear() { this.data = {}; },
    });
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({}),
      })
    ));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('shows the reagent name in the modal subtitle', () => {
    render(<FormBaixa reagente={reagente} onClose={onClose} dispatch={dispatch} />, { wrapper });
    expect(screen.getByText(/Reagente Teste/)).toBeInTheDocument();
  });

  it('shows current stock in the subtitle', () => {
    render(<FormBaixa reagente={reagente} onClose={onClose} dispatch={dispatch} />, { wrapper });
    expect(screen.getByText(/estoque atual 5/)).toBeInTheDocument();
  });

  it('updates the remaining stock preview as quantity is entered', async () => {
    render(<FormBaixa reagente={reagente} onClose={onClose} dispatch={dispatch} />, { wrapper });
    const quantityInput = screen.getAllByRole('spinbutton')[0];
    await userEvent.type(quantityInput, '2');
    expect(screen.getByDisplayValue('3.00 L')).toBeInTheDocument();
  });

  it('recusa quantidade acima do estoque com erro inline, sem alert', async () => {
    render(<FormBaixa reagente={reagente} onClose={onClose} dispatch={dispatch} />, { wrapper });
    const quantityInput = screen.getAllByRole('spinbutton')[0];
    await userEvent.type(quantityInput, '10');
    await userEvent.click(screen.getByRole('button', { name: /Confirmar baixa/i }));
    expect(window.alert).not.toHaveBeenCalled();
    expect(screen.getByText('Quantidade maior que o estoque disponível (5 L).')).toBeInTheDocument();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('recusa quantidade vazia com erro inline, sem alert', async () => {
    render(<FormBaixa reagente={reagente} onClose={onClose} dispatch={dispatch} />, { wrapper });
    await userEvent.click(screen.getByRole('button', { name: /Confirmar baixa/i }));
    expect(window.alert).not.toHaveBeenCalled();
    expect(screen.getByText('Informe uma quantidade válida.')).toBeInTheDocument();
  });

  it('mostra o estoque restante negativo em vez de zerar no clamp', async () => {
    render(<FormBaixa reagente={reagente} onClose={onClose} dispatch={dispatch} />, { wrapper });
    const quantityInput = screen.getAllByRole('spinbutton')[0];
    await userEvent.type(quantityInput, '10');
    expect(screen.getByDisplayValue('-5.00 L')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('0.00 L')).toBeNull();
  });

  it('limpa o erro quando a quantidade muda', async () => {
    render(<FormBaixa reagente={reagente} onClose={onClose} dispatch={dispatch} />, { wrapper });
    await userEvent.click(screen.getByRole('button', { name: /Confirmar baixa/i }));
    expect(screen.getByText('Informe uma quantidade válida.')).toBeInTheDocument();
    await userEvent.type(screen.getAllByRole('spinbutton')[0], '1');
    expect(screen.queryByText('Informe uma quantidade válida.')).toBeNull();
  });

  it('calls dispatch with refresh and flashId on valid submit', async () => {
    render(<FormBaixa reagente={reagente} onClose={onClose} dispatch={dispatch} />, { wrapper });
    const quantityInput = screen.getAllByRole('spinbutton')[0];
    await userEvent.type(quantityInput, '1.5');
    await userEvent.click(screen.getByRole('button', { name: /Confirmar baixa/i }));
    await waitFor(() => expect(dispatch).toHaveBeenCalledWith({ type: 'refresh', flashId: 'R-TEST' }));
  });

  it('calls onClose on valid submit', async () => {
    render(<FormBaixa reagente={reagente} onClose={onClose} dispatch={dispatch} />, { wrapper });
    const quantityInput = screen.getAllByRole('spinbutton')[0];
    await userEvent.type(quantityInput, '1.5');
    await userEvent.click(screen.getByRole('button', { name: /Confirmar baixa/i }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('calls onClose when Cancelar is clicked', async () => {
    render(<FormBaixa reagente={reagente} onClose={onClose} dispatch={dispatch} />, { wrapper });
    await userEvent.click(screen.getByRole('button', { name: /Cancelar/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
