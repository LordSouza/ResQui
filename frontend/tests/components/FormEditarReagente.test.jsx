import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FormEditarReagente } from '../../src/forms/FormEditarReagente';

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
          { nome: 'Química Orgânica', armarios: ['Inflamáveis'] },
        ] });
      }
      if (String(url) === '/api/usuarios/nomes') {
        return Promise.resolve({ ok: true, status: 200, json: async () => [
          { id: 'u-1', nome: 'Ana Lima', email: 'ana@x.com' },
        ] });
      }
      if (String(url).startsWith('/api/usuarios')) {
        return Promise.resolve({ ok: false, status: 403, text: async () => '' });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
    }));
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  const reagente = {
    id: 'R-001', nome: 'Ácido', estoque: 5, estoque_min: 1,
    local: 'Lab Antigo · Prateleira Z', responsavel: 'Fulano Legado', validade: null,
  };

  it('mostra os selects da API e preserva o valor legado como opção selecionada', async () => {
    render(<FormEditarReagente reagente={reagente} onClose={vi.fn()} dispatch={vi.fn()} />, { wrapper });

    // opções vindas da API
    expect(await screen.findByRole('option', { name: 'Química Orgânica · Inflamáveis' })).toBeInTheDocument();
    expect(await screen.findByRole('option', { name: 'Ana Lima' })).toBeInTheDocument();

    // valores legados preservados e selecionados
    const localSelect = screen.getByLabelText('Localização do reagente');
    expect(localSelect.value).toBe('Lab Antigo · Prateleira Z');
    const respSelect = screen.getByLabelText('Responsável pelo reagente');
    expect(respSelect.value).toBe('Fulano Legado');
  });
});
