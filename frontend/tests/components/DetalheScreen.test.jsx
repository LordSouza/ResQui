// frontend/tests/components/DetalheScreen.test.jsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DetalheScreen } from '../../src/screens/DetalheScreen';
import { initialState } from '../../src/store/reducer';

vi.mock('../../src/compat/useCompatMatriz', () => ({
  useCompatMatriz: vi.fn(),
}));
vi.mock('../../src/reagentes/useReagente', () => ({
  useReagente: vi.fn(),
}));
vi.mock('../../src/reagentes/useReagentes', () => ({
  useReagentes: vi.fn(),
}));
vi.mock('../../src/reagentes/useDeletarReagente', () => ({
  useDeletarReagente: vi.fn(),
}));
vi.mock('../../src/reagentes/useLotes', () => ({
  useLotes: vi.fn(),
}));
vi.mock('../../src/reagentes/useCriarLote', () => ({
  useCriarLote: vi.fn(),
}));
vi.mock('../../src/reagentes/useBaixaLote', () => ({
  useBaixaLote: vi.fn(),
}));
vi.mock('../../src/reagentes/useMovimentacoes', () => ({
  useMovimentacoes: vi.fn(),
}));
vi.mock('../../src/auth/AuthContext', () => ({
  useAuth: vi.fn(),
}));

import { useCompatMatriz } from '../../src/compat/useCompatMatriz';
import { useReagente } from '../../src/reagentes/useReagente';
import { useReagentes } from '../../src/reagentes/useReagentes';
import { useDeletarReagente } from '../../src/reagentes/useDeletarReagente';
import { useLotes } from '../../src/reagentes/useLotes';
import { useCriarLote } from '../../src/reagentes/useCriarLote';
import { useBaixaLote } from '../../src/reagentes/useBaixaLote';
import { useMovimentacoes } from '../../src/reagentes/useMovimentacoes';
import { useAuth } from '../../src/auth/AuthContext';

// r é classe 1; x (mesmo armário) é classe 3 — nível 3 (Proibido) na matriz mockada.
const reagente = {
  id: 'R-00001', nome: 'Acetona', cas: '67-64-1', formula: 'C3H6O', sinonimo: 'Propanona',
  classe: 1, local: 'Lab A · Armário 1', responsavel: 'Fulano', estoque: 10, unidade: 'L',
  estoque_min: 5, validade: '2027-01-01', validade_status: 'ok', lote: 'L-1', controlado: false,
  pictos: [], signal: 'Perigo', h: [], p: [], abertura: '2026-01-01',
};

const vizinho = {
  id: 'R-00002', nome: 'Ácido nítrico', local: 'Lab A · Armário 1', classe: 3,
};

const baseMatrix = { 1: [0, 1, 3], 2: [1, 0, 2], 3: [3, 2, 0] };
const baseFonte = {
  fonte: 'EPA-600/2-80-076',
  referencia: 'Johnson, L. E. & Farr, J. K. (2008).',
  url: 'https://www.epa.gov/',
  revisadoEm: '2026-07-27',
  detalhamento: 'docs/compatibilidade-proveniencia.md',
};

beforeEach(() => {
  useCompatMatriz.mockReturnValue({ data: { matrix: baseMatrix, fonte: baseFonte }, isPending: false, isError: false });
  useReagente.mockReturnValue({ data: reagente, isPending: false, isError: false, refetch: vi.fn() });
  useReagentes.mockReturnValue({ data: { items: [reagente, vizinho], total: 2 }, isPending: false, isError: false });
  useDeletarReagente.mockReturnValue({ mutate: vi.fn(), isPending: false });
  useLotes.mockReturnValue({ data: [], isPending: false });
  useCriarLote.mockReturnValue({ mutate: vi.fn(), isPending: false });
  useBaixaLote.mockReturnValue({ mutate: vi.fn(), isPending: false });
  useMovimentacoes.mockReturnValue({ data: [], isPending: false });
  useAuth.mockReturnValue({ user: { papel: 'Professor' } });
});

afterEach(() => vi.clearAllMocks());

describe('DetalheScreen', () => {
  it('deriva a matriz do shape { matrix, fonte } e não trata pares de alto risco como compatíveis', () => {
    render(<DetalheScreen state={{ ...initialState, detailId: 'R-00001' }} dispatch={vi.fn()} />);

    // classe 1 x classe 3 = nível 3 (Proibido) na matriz mockada — nunca "Compatível".
    expect(screen.getByText('Proibido')).toBeInTheDocument();
    expect(screen.queryByText('Compatível')).not.toBeInTheDocument();
  });
});

// Três policies distintas convivem nesta tela: baixa direta, transferência e baixa de lote são
// Operacional; criar lote é Operacao; editar e excluir reagente são Cadastro.
describe('DetalheScreen — permissões', () => {
  const renderCom = (papel) => {
    useAuth.mockReturnValue({ user: { papel } });
    return render(<DetalheScreen state={{ ...initialState, detailId: 'R-00001' }} dispatch={vi.fn()} />);
  };

  beforeEach(() => {
    useLotes.mockReturnValue({
      data: [{ id: 1, codigo: 'L-001', estoque: 4, validade: '2027-01-01', validadeStatus: 'ok' }],
      isPending: false,
    });
  });

  it('Professor alcança todas as ações do reagente', () => {
    renderCom('Professor');
    expect(screen.getByRole('button', { name: /Baixar consumo/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Transferir/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Novo lote/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Baixa$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Editar$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Excluir/i })).toBeInTheDocument();
  });

  // Aluno tem Operacional — as duas baixas decrementam o mesmo saldo, e o gate delas é o mesmo.
  it('Aluno baixa reagente e lote e transfere, mas não cria lote, edita nem exclui', () => {
    renderCom('Aluno');
    expect(screen.getByRole('button', { name: /Baixar consumo/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Transferir/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Baixa$/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Novo lote/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Editar$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Excluir/i })).not.toBeInTheDocument();
  });

  it('mantém leitura para todos: rótulo PDF e resumo de segurança', () => {
    renderCom('Aluno');
    expect(screen.getByRole('button', { name: /Rótulo PDF/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Resumo de segurança/i })).toBeInTheDocument();
  });
});
