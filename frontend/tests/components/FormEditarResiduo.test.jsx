import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FormEditarResiduo } from '../../src/forms/residuos';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const RESIDUO_CLASSIFICADO = {
  id: 7, tipo: 'Solventes orgânicos não-halogenados', volume: 2, unidade: 'L',
  composicao: 'Acetona 70%', risco: 'medio', classes: [5],
};

describe('FormEditarResiduo — classificação', () => {
  let onClose, dispatch;

  beforeEach(() => {
    onClose = vi.fn();
    dispatch = vi.fn();
    vi.stubGlobal('localStorage', {
      data: {},
      setItem(k, v) { this.data[k] = String(v); },
      getItem(k) { return this.data[k] ?? null; },
      removeItem(k) { delete this.data[k]; },
      clear() { this.data = {}; },
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) }));
  });

  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it('impede salvar um resíduo classificado com todas as classes desmarcadas', async () => {
    render(<FormEditarResiduo residuo={RESIDUO_CLASSIFICADO} onClose={onClose} dispatch={dispatch} />, { wrapper });
    const botao = screen.getByRole('button', { name: /Salvar alterações/i });
    expect(botao).toBeEnabled();
    await userEvent.click(screen.getByLabelText(/5\. Solventes orgânicos/));
    expect(botao).toBeDisabled();
  });

  it('mantém editável o resíduo legado que nunca teve classificação', () => {
    render(<FormEditarResiduo residuo={{ ...RESIDUO_CLASSIFICADO, classes: [] }} onClose={onClose} dispatch={dispatch} />, { wrapper });
    expect(screen.getByRole('button', { name: /Salvar alterações/i })).toBeEnabled();
  });

  it('omite ClassesReatividade ao salvar o resíduo legado, porque a lista vazia explícita é recusada', async () => {
    render(<FormEditarResiduo residuo={{ ...RESIDUO_CLASSIFICADO, classes: [] }} onClose={onClose} dispatch={dispatch} />, { wrapper });

    await userEvent.click(screen.getByRole('button', { name: /Salvar alterações/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    const put = fetch.mock.calls.find(c => c[1]?.method === 'PUT');
    expect(JSON.parse(put[1].body)).not.toHaveProperty('ClassesReatividade');
  });

  it('envia as classes do resíduo já classificado', async () => {
    render(<FormEditarResiduo residuo={RESIDUO_CLASSIFICADO} onClose={onClose} dispatch={dispatch} />, { wrapper });

    await userEvent.click(screen.getByRole('button', { name: /Salvar alterações/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    const put = fetch.mock.calls.find(c => c[1]?.method === 'PUT');
    expect(JSON.parse(put[1].body).ClassesReatividade).toEqual([5]);
  });

  describe('com resíduo gravado antes de uma revisão da matriz', () => {
    const MATRIZ = { entries: [{ classeA: 1, classeB: 3, nivel: 3 }, { classeA: 3, classeB: 1, nivel: 3 }], fonte: null };
    const RESIDUO_PROIBIDO = { ...RESIDUO_CLASSIFICADO, classes: [1, 3] };

    beforeEach(() => {
      vi.stubGlobal('fetch', vi.fn().mockImplementation((url) => Promise.resolve({
        ok: true, status: 200,
        json: async () => (String(url).startsWith('/api/compat/matriz') ? MATRIZ : {}),
      })));
    });

    it('mantém salvável quando as classes não mudam, como o servidor', async () => {
      render(<FormEditarResiduo residuo={RESIDUO_PROIBIDO} onClose={onClose} dispatch={dispatch} />, { wrapper });
      expect(await screen.findByText(/gravada antes da regra atual/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Salvar alterações/i })).toBeEnabled();
    });

    it('bloqueia quando a nova combinação continua proibida', async () => {
      render(<FormEditarResiduo residuo={RESIDUO_PROIBIDO} onClose={onClose} dispatch={dispatch} />, { wrapper });
      await userEvent.click(screen.getByLabelText(/^5\./));
      expect(await screen.findByText(/o sistema recusa o registro/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Salvar alterações/i })).toBeDisabled();
    });
  });
});

