import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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
});
