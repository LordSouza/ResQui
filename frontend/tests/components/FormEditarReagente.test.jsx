import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { FormEditarReagente } from '../../src/forms/FormEditarReagente';

vi.mock('../../src/auth/AuthContext', () => ({ useAuth: () => ({ user: { papel: 'Admin' } }) }));

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('FormEditarReagente', () => {
  beforeEach(() => {
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
          { id: 'Lab-001', nome: 'Química Orgânica', armarios: ['Inflamáveis'] },
        ] });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
    }));
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it('abre com o laboratório e o armário gravados e preserva o armário que saiu da lista', async () => {
    const reagente = {
      id: 'R-001', nome: 'Ácido', estoque: 5, estoque_min: 1, validade: null,
      local: 'Química Orgânica · Armário Antigo', laboratorioId: 'Lab-001', armario: 'Armário Antigo',
    };
    render(<FormEditarReagente reagente={reagente} onClose={vi.fn()} dispatch={vi.fn()} />, { wrapper });

    expect(await screen.findByRole('option', { name: 'Química Orgânica' })).toBeInTheDocument();
    expect(screen.getByLabelText('Laboratório')).toHaveValue('Lab-001');
    expect(screen.getByLabelText('Armário')).toHaveValue('Armário Antigo');
    expect(screen.getByRole('option', { name: 'Inflamáveis' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Responsável pelo reagente')).toBeNull();
  });

  it('reagente sem laboratório mostra o local anterior e exige escolher um antes de salvar', async () => {
    const reagente = {
      id: 'R-002', nome: 'Ácido', estoque: 5, estoque_min: 1, validade: null,
      local: 'Sem laboratório · Lab-201 · Armário A', laboratorioId: null, armario: 'Lab-201 · Armário A',
    };
    render(<FormEditarReagente reagente={reagente} onClose={vi.fn()} dispatch={vi.fn()} />, { wrapper });

    expect(screen.getByText(/Local anterior: Sem laboratório · Lab-201 · Armário A/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    expect(screen.getByText('Escolha o laboratório.')).toBeInTheDocument();
    expect(fetch.mock.calls.find(c => c[1]?.method === 'PUT')).toBeUndefined();
  });
});
