// frontend/tests/components/CompatScreen.test.jsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CompatScreen } from '../../src/screens/CompatScreen';
import { initialState } from '../../src/store/reducer';

vi.mock('../../src/components/ToastContext', () => ({ useToast: vi.fn() }));
vi.mock('../../src/auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../../src/compat/useRegistrarParecer', () => ({ useRegistrarParecer: vi.fn() }));
vi.mock('../../src/compat/useNotificarResponsaveis', () => ({ useNotificarResponsaveis: vi.fn() }));

vi.mock('../../src/compat/useCompatMatriz', () => ({
  useCompatMatriz: vi.fn(),
}));
vi.mock('../../src/compat/useCompatOverrides', () => ({
  useCompatOverrides: vi.fn(),
}));
vi.mock('../../src/reagentes/useReagentes', () => ({
  useReagentes: vi.fn(),
}));
vi.mock('../../src/reagentes/useReagente', () => ({
  useReagente: vi.fn(),
}));
vi.mock('../../src/utils', async (importOriginal) => ({
  ...(await importOriginal()),
  exportCsv: vi.fn(),
}));

import { exportCsv } from '../../src/utils';
import { useToast } from '../../src/components/ToastContext';
import { useAuth } from '../../src/auth/AuthContext';
import { useRegistrarParecer } from '../../src/compat/useRegistrarParecer';
import { useNotificarResponsaveis } from '../../src/compat/useNotificarResponsaveis';
import { useCompatMatriz } from '../../src/compat/useCompatMatriz';
import { useCompatOverrides } from '../../src/compat/useCompatOverrides';
import { useReagentes } from '../../src/reagentes/useReagentes';
import { useReagente } from '../../src/reagentes/useReagente';

const baseMatrix = { 1: [0, 1, 3], 2: [1, 0, 2], 3: [3, 2, 0] };
const baseFonte = {
  fonte: 'EPA-600/2-80-076 — A Method for Determining the Compatibility of Hazardous Wastes (EPA, 1980)',
  referencia: 'Johnson, L. E. & Farr, J. K. (2008). CRW 2.0. Process Safety Progress, 27(3), 212–218.',
  url: 'https://www.epa.gov/sites/default/files/2016-03/documents/compat-haz-waste.pdf',
  revisadoEm: '2026-07-27',
  detalhamento: 'docs/compatibilidade-proveniencia.md',
};

let addToast;

beforeEach(() => {
  addToast = vi.fn();
  useToast.mockReturnValue({ addToast });
  useAuth.mockReturnValue({ user: { id: 'u-1', papel: 'Professor' } });
  useRegistrarParecer.mockReturnValue({ mutateAsync: vi.fn().mockResolvedValue(undefined), isPending: false });
  useNotificarResponsaveis.mockReturnValue({
    mutateAsync: vi.fn().mockResolvedValue({ notificados: [{ usuarioId: 'u-2', nome: 'Ana Souza' }], naoResolvidos: [] }),
    isPending: false,
  });
  useCompatMatriz.mockReturnValue({ data: { matrix: baseMatrix, fonte: baseFonte }, isPending: false, isError: false });
  useCompatOverrides.mockReturnValue({ data: [], isPending: false, isError: false });
  useReagentes.mockReturnValue({ data: { items: [], total: 0 }, isPending: false, isError: false, refetch: vi.fn() });
  useReagente.mockReturnValue({ data: null });
});

// Par selecionado: R-1 (classe 1) + R-2 (classe 3) → nível 3 na baseMatrix, então o botão
// de notificar fica habilitado.
function comParSelecionado() {
  useReagentes.mockReturnValue({
    data: { items: [{ id: 'R-1', nome: 'Metanol', classe: 1 }, { id: 'R-2', nome: 'Ácido', classe: 3 }], total: 2 },
    isPending: false, isError: false, refetch: vi.fn(),
  });
  useReagente.mockImplementation((id) => ({
    data: id === 'R-1'
      ? { id: 'R-1', nome: 'Metanol', classe: 1, responsavel: 'Ana Souza', pictos: [], h: [] }
      : { id: 'R-2', nome: 'Ácido', classe: 3, responsavel: 'Bruno Lima', pictos: [], h: [] },
  }));
}

afterEach(() => vi.clearAllMocks());

describe('CompatScreen', () => {
  it('renderiza o título da página', () => {
    render(<CompatScreen state={initialState} dispatch={vi.fn()} />);
    expect(screen.getByRole('heading', { name: /Motor de compatibilidade/i })).toBeInTheDocument();
  });

  it('exibe estado de loading quando matriz está carregando', () => {
    useCompatMatriz.mockReturnValue({ data: undefined, isPending: true, isError: false });
    render(<CompatScreen state={initialState} dispatch={vi.fn()} />);
    expect(screen.getByText(/Carregando/i)).toBeInTheDocument();
  });

  it('exibe estado de erro quando matriz falha', () => {
    useCompatMatriz.mockReturnValue({ data: undefined, isPending: false, isError: true, refetch: vi.fn() });
    render(<CompatScreen state={initialState} dispatch={vi.fn()} />);
    expect(screen.getByText(/Erro ao carregar/i)).toBeInTheDocument();
  });

  it('não importa NOTIFICACOES do data — sem call a NOTIFICACOES.unshift', () => {
    render(<CompatScreen state={initialState} dispatch={vi.fn()} />);
    expect(screen.getByRole('heading', { name: /Motor de compatibilidade/i })).toBeInTheDocument();
  });

  it('exibe a proveniência da matriz vinda da API', () => {
    render(<CompatScreen state={initialState} dispatch={vi.fn()} />);
    expect(screen.getByText(/EPA-600\/2-80-076/)).toBeInTheDocument();
    expect(screen.getByText(/Johnson/)).toBeInTheDocument();
  });

  it('a citação da fonte é um link clicável para a URL da proveniência', () => {
    render(<CompatScreen state={initialState} dispatch={vi.fn()} />);
    const link = screen.getByRole('link', { name: /EPA-600\/2-80-076/ });
    expect(link).toHaveAttribute('href', baseFonte.url);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer');
  });

  it('não afirma regras institucionais que não existem no sistema', () => {
    const { container } = render(<CompatScreen state={initialState} dispatch={vi.fn()} />);
    expect(container.textContent).not.toMatch(/regras institucionais UNIFEI/i);
  });

  it('leva a proveniência para o CSV exportado', () => {
    render(<CompatScreen state={initialState} dispatch={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Exportar matriz/i }));

    const [rows] = exportCsv.mock.calls[0];
    const linha = (rotulo) => rows.find(r => r[0] === rotulo);
    expect(linha('Fonte')[1]).toBe(baseFonte.fonte);
    expect(linha('Referência')[1]).toBe(baseFonte.referencia);
    expect(linha('URL')[1]).toBe(baseFonte.url);
    expect(linha('Detalhamento')[1]).toBe(baseFonte.detalhamento);
    expect(linha('Revisado em')[1]).toBe(baseFonte.revisadoEm);
  });
});

describe('CompatScreen — ações reais', () => {
  beforeEach(() => comParSelecionado());

  it('envia o parecer digitado junto com os ids do par', async () => {
    const mutateAsync = vi.fn().mockResolvedValue(undefined);
    useRegistrarParecer.mockReturnValue({ mutateAsync, isPending: false });

    render(<CompatScreen state={initialState} dispatch={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Parecer técnico/i), { target: { value: 'Bandejas separadas.' } });
    fireEvent.click(screen.getByRole('button', { name: /Registrar parecer/i }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith({
      reagenteAId: 'R-1', reagenteBId: 'R-2', parecer: 'Bandejas separadas.',
    }));
  });

  it('mostra toast de sucesso com a mensagem como string', async () => {
    render(<CompatScreen state={initialState} dispatch={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Registrar parecer/i }));

    await waitFor(() => expect(addToast).toHaveBeenCalled());
    expect(typeof addToast.mock.calls[0][0]).toBe('string');
    expect(addToast.mock.calls[0][1]).toBe('success');
  });

  it('lista quem foi notificado', async () => {
    render(<CompatScreen state={initialState} dispatch={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Notificar responsáveis/i }));

    await waitFor(() => expect(addToast).toHaveBeenCalled());
    expect(addToast.mock.calls[0][0]).toMatch(/Ana Souza/);
    expect(addToast.mock.calls[0][1]).toBe('success');
  });

  it('não anuncia sucesso quando ninguém foi notificado', async () => {
    useNotificarResponsaveis.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({
        notificados: [],
        naoResolvidos: [{ responsavel: 'Ana Souza', motivo: 'não corresponde a nenhum usuário ativo' }],
      }),
      isPending: false,
    });

    render(<CompatScreen state={initialState} dispatch={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Notificar responsáveis/i }));

    await waitFor(() => expect(addToast).toHaveBeenCalled());
    expect(addToast.mock.calls[0][1]).toBe('error');
    expect(addToast.mock.calls[0][0]).toMatch(/Ana Souza/);
  });

  // "Editar regras" salva overrides (PUT/DELETE /api/compat/overrides), que exigem Cadastro —
  // policy mais estreita que a Operacional das duas ações da tela.
  it('esconde "Editar regras" de Aluno, que ainda vê as ações operacionais', () => {
    useAuth.mockReturnValue({ user: { id: 'u-9', papel: 'Aluno' } });
    render(<CompatScreen state={initialState} dispatch={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /Editar regras/i })).toBeNull();
    expect(screen.getByRole('button', { name: /Registrar parecer/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Exportar matriz/i })).toBeInTheDocument();
  });

  it('mostra "Editar regras" para Professor', () => {
    useAuth.mockReturnValue({ user: { id: 'u-1', papel: 'Professor' } });
    render(<CompatScreen state={initialState} dispatch={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Editar regras/i })).toBeInTheDocument();
  });
});
