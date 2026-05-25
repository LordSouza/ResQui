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

  it('shows alert when quantity exceeds stock', async () => {
    render(<FormBaixa reagente={reagente} onClose={onClose} dispatch={dispatch} />, { wrapper });
    const quantityInput = screen.getAllByRole('spinbutton')[0];
    await userEvent.type(quantityInput, '10');
    await userEvent.click(screen.getByRole('button', { name: /Confirmar baixa/i }));
    expect(window.alert).toHaveBeenCalledWith('Quantidade maior que o estoque disponível.');
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('shows alert when quantity is zero or empty', async () => {
    render(<FormBaixa reagente={reagente} onClose={onClose} dispatch={dispatch} />, { wrapper });
    await userEvent.click(screen.getByRole('button', { name: /Confirmar baixa/i }));
    expect(window.alert).toHaveBeenCalledWith('Informe uma quantidade válida.');
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
