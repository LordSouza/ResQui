import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FormTransferirReagente } from '../../src/forms/reagentes';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('FormTransferirReagente', () => {
  let onClose;
  let dispatch;
  let reagente;

  beforeEach(() => {
    onClose = vi.fn();
    dispatch = vi.fn();
    reagente = { id: 'R-TEST', nome: 'Reagente Teste', local: 'Lab Antigo · Prateleira Z' };
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
          { nome: 'Química Orgânica', armarios: ['Inflamáveis', 'Ácidos'] },
        ] });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
    }));
  });

  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it('shows the reagent name and current location', () => {
    render(<FormTransferirReagente reagente={reagente} onClose={onClose} dispatch={dispatch} />, { wrapper });
    expect(screen.getByText(/Reagente Teste/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Local atual/i)).toHaveValue('Lab Antigo · Prateleira Z');
  });

  it('alerts when no destination is selected', async () => {
    render(<FormTransferirReagente reagente={reagente} onClose={onClose} dispatch={dispatch} />, { wrapper });
    await userEvent.click(screen.getByRole('button', { name: /Confirmar transferência/i }));
    expect(window.alert).toHaveBeenCalledWith('Escolha um destino diferente do local atual.');
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('dispatches refresh and closes on valid transfer', async () => {
    render(<FormTransferirReagente reagente={reagente} onClose={onClose} dispatch={dispatch} />, { wrapper });
    await screen.findByRole('option', { name: 'Química Orgânica · Inflamáveis' });
    await userEvent.selectOptions(screen.getByLabelText(/Destino/i), 'Química Orgânica · Inflamáveis');
    await userEvent.click(screen.getByRole('button', { name: /Confirmar transferência/i }));
    await waitFor(() => expect(dispatch).toHaveBeenCalledWith({ type: 'refresh', flashId: 'R-TEST' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('calls onClose when Cancelar is clicked', async () => {
    render(<FormTransferirReagente reagente={reagente} onClose={onClose} dispatch={dispatch} />, { wrapper });
    await userEvent.click(screen.getByRole('button', { name: /Cancelar/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
