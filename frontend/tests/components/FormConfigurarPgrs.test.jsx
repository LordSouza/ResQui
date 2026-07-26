import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FormConfigurarPgrs } from '../../src/forms/residuos';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const CONFIG = {
  razaoSocial: 'Instituição Teste', cnpj: '12.345.678/0001-95',
  endereco: 'Rua A, 100', unidade: 'Instituto Teste',
  respTecnico: 'Resp. Teste', respCrq: 'CRQ-123',
  respEmail: 'resp@inst.edu.br', respTel: '(00) 1111-2222',
  geradorPadrao: 'Instituição Teste', transportadorPadrao: 'Transportadora Teste',
  destinadorPadrao: 'Destinadora Teste', codigoIbamaPadrao: 'A099',
  atualizadoEm: '2026-07-26T12:00:00Z',
};

describe('FormConfigurarPgrs', () => {
  let mockFetch;

  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      data: {},
      setItem(k, v) { this.data[k] = String(v); },
      getItem(k) { return this.data[k] ?? null; },
      removeItem(k) { delete this.data[k]; },
      clear() { this.data = {}; },
    });
    mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => CONFIG });
    vi.stubGlobal('fetch', mockFetch);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('carrega os valores da API nos campos', async () => {
    render(<FormConfigurarPgrs onClose={vi.fn()} />, { wrapper });
    await waitFor(() => expect(screen.getByLabelText(/Razão social/i)).toHaveValue('Instituição Teste'));
    expect(screen.getByLabelText(/CNPJ/i)).toHaveValue('12.345.678/0001-95');
    expect(screen.getByLabelText(/Transportador padrão/i)).toHaveValue('Transportadora Teste');
  });

  it('salva via PUT e fecha', async () => {
    const onClose = vi.fn();
    render(<FormConfigurarPgrs onClose={onClose} />, { wrapper });
    await waitFor(() => expect(screen.getByLabelText(/Razão social/i)).toHaveValue('Instituição Teste'));

    await userEvent.clear(screen.getByLabelText(/Razão social/i));
    await userEvent.type(screen.getByLabelText(/Razão social/i), 'Nova Instituição');
    await userEvent.click(screen.getByRole('button', { name: /Salvar configuração/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    const put = mockFetch.mock.calls.find(c => c[1]?.method === 'PUT');
    expect(put).toBeTruthy();
    expect(JSON.parse(put[1].body).RazaoSocial).toBe('Nova Instituição');
  });

  it('não expõe os campos sem consumidor nem promessas falsas', async () => {
    render(<FormConfigurarPgrs onClose={vi.fn()} />, { wrapper });
    await waitFor(() => expect(screen.getByLabelText(/Razão social/i)).toBeInTheDocument());
    const texto = document.body.textContent;
    expect(texto).not.toMatch(/SISEMA/i);
    expect(texto).not.toMatch(/Publicar no/i);
    expect(texto).not.toMatch(/Não-geração/i);
    expect(texto).not.toMatch(/Perfurocortantes/i);
    expect(texto).not.toMatch(/Workflow de assinatura/i);
    expect(texto).not.toMatch(/5 anos/i);
    expect(texto).not.toMatch(/Meta/i);
  });

  it('não chumba dados de instituição real', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    render(<FormConfigurarPgrs onClose={vi.fn()} />, { wrapper });
    await waitFor(() => expect(screen.getByLabelText(/Razão social/i)).toHaveValue(''));
    expect(document.body.textContent).not.toMatch(/UNIFEI|Itajubá|Ana Lúcia|CRQ III/i);
  });
});
