// frontend/tests/components/MtrScreen.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MtrScreen } from '../../src/screens/MtrScreen';
import { initialState } from '../../src/store/reducer';

vi.mock('../../src/auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../../src/mtrs/useMtrs', () => ({ useMtrs: vi.fn() }));
vi.mock('../../src/residuos/useResíduos', () => ({ useResíduos: vi.fn() }));
vi.mock('../../src/mtrs/useConfirmarDestinacao', () => ({ useConfirmarDestinacao: () => ({ mutate: vi.fn(), isPending: false }) }));
vi.mock('../../src/mtrs/useReabrirDestinacao', () => ({ useReabrirDestinacao: () => ({ mutate: vi.fn(), isPending: false }) }));

import { useAuth } from '../../src/auth/AuthContext';
import { useMtrs } from '../../src/mtrs/useMtrs';
import { useResíduos } from '../../src/residuos/useResíduos';

const mtr = {
  id: 1,
  numero: 'MTR-2026-0001',
  gerador: 'Unifei',
  transportadora: 'EcoLog',
  data_emissao: '2026-07-20T10:00:00',
  destinador: 'EcoQuímica SA',
  codigo_ibama: 'A099',
  total_litros: 30,
  total_quilos: 12.5,
  residuo_ids: [7],
};

const renderCom = (papel) => {
  useAuth.mockReturnValue({ user: { id: 'u-1', papel } });
  return render(<MtrScreen state={initialState} dispatch={vi.fn()} />);
};

beforeEach(() => {
  useMtrs.mockReturnValue({ data: [mtr], isPending: false, isError: false, refetch: vi.fn() });
  useResíduos.mockReturnValue({ data: [], isPending: false, isError: false, refetch: vi.fn() });
});

describe('MtrScreen', () => {
  it('seleciona, destaca e rola até o manifesto recém-emitido', () => {
    const novo = { ...mtr, id: 2, numero: 'MTR-2026-0002' };
    useMtrs.mockReturnValue({ data: [mtr, novo], isPending: false, isError: false, refetch: vi.fn() });
    const scrollIntoView = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoView;
    useAuth.mockReturnValue({ user: { id: 'u-1', papel: 'Professor' } });
    render(<MtrScreen state={{ ...initialState, screen: 'mtr', flashId: 2 }} dispatch={vi.fn()} />);

    const linha = screen.getByRole('cell', { name: 'MTR-2026-0002' }).closest('tr');
    expect(linha).toHaveClass('selected');
    expect(linha).toHaveClass('flash');
    expect(scrollIntoView).toHaveBeenCalled();
    delete window.HTMLElement.prototype.scrollIntoView;
  });

  it('lista os MTRs emitidos', () => {
    renderCom('Professor');
    expect(screen.getAllByText('MTR-2026-0001').length).toBeGreaterThan(0);
  });

  // POST /api/mtrs exige a policy Operacao.
  it.each(['Professor', 'Professor', 'Professor'])('mostra "Novo manifesto" para %s', (papel) => {
    renderCom(papel);
    expect(screen.getByRole('button', { name: /Novo manifesto/i })).toBeInTheDocument();
  });

  it('esconde "Novo manifesto" de Aluno', () => {
    renderCom('Aluno');
    expect(screen.queryByRole('button', { name: /Novo manifesto/i })).not.toBeInTheDocument();
  });

  it('mostra litros e quilos do manifesto', () => {
    renderCom('Professor');
    expect(screen.getAllByText(/30\.00 L · 12\.50 kg/).length).toBeGreaterThan(0);
  });

  it('mantém a lista visível para quem não pode emitir', () => {
    renderCom('Aluno');
    expect(screen.getAllByText('MTR-2026-0001').length).toBeGreaterThan(0);
  });

  it('avisa quando nenhum resíduo do manifesto está no escopo, sem dizer "Mais"', () => {
    renderCom('Professor');
    expect(screen.getByText(/Os 1 resíduo\(s\) deste manifesto são de laboratórios/)).toBeInTheDocument();
    expect(screen.queryByText('Nenhum resíduo vinculado.')).not.toBeInTheDocument();
  });

  it('diz "Mais" quando parte dos resíduos do manifesto aparece na lista', () => {
    useMtrs.mockReturnValue({ data: [{ ...mtr, residuo_ids: [7, 8] }], isPending: false, isError: false, refetch: vi.fn() });
    useResíduos.mockReturnValue({
      data: [{ id: 7, descricao: 'Solvente', tipo: 'Solventes', volume: 30, unidade: 'L', risco: 'medio' }],
      isPending: false, isError: false, refetch: vi.fn(),
    });
    renderCom('Professor');
    expect(screen.getByText(/Mais 1 resíduo\(s\) deste manifesto são de laboratórios/)).toBeInTheDocument();
  });

  it('não avisa quando todos os resíduos do manifesto estão visíveis', () => {
    useResíduos.mockReturnValue({
      data: [{ id: 7, descricao: 'Solvente', tipo: 'Solventes', volume: 30, unidade: 'L', risco: 'medio' }],
      isPending: false, isError: false, refetch: vi.fn(),
    });
    renderCom('Professor');
    expect(screen.queryByText(/deste manifesto são de laboratórios/)).not.toBeInTheDocument();
  });
});

const destinado = { ...mtr, id: 2, numero: 'MTR-2026-0002', data_destinacao: '2026-08-01' };
const comDestinado = () =>
  useMtrs.mockReturnValue({ data: [destinado], isPending: false, isError: false, refetch: vi.fn() });

describe('MtrScreen · destinação', () => {
  // POST /api/mtrs/:id/destinacao exige a policy Operacao.
  it.each(['Professor', 'Professor', 'Professor'])('mostra "Confirmar destinação" para %s', (papel) => {
    renderCom(papel);
    expect(screen.getByRole('button', { name: /Confirmar destinação/i })).toBeInTheDocument();
  });

  it('esconde "Confirmar destinação" de Aluno', () => {
    renderCom('Aluno');
    expect(screen.queryByRole('button', { name: /Confirmar destinação/i })).not.toBeInTheDocument();
  });

  it('esconde "Confirmar destinação" de manifesto já destinado', () => {
    comDestinado();
    renderCom('Professor');
    expect(screen.queryByRole('button', { name: /Confirmar destinação/i })).not.toBeInTheDocument();
  });

  it('mostra "Reabrir manifesto" para Professor em manifesto destinado', () => {
    comDestinado();
    renderCom('Professor');
    expect(screen.getByRole('button', { name: /Reabrir manifesto/i })).toBeInTheDocument();
  });

  it('esconde "Reabrir manifesto" de Aluno', () => {
    comDestinado();
    renderCom('Aluno');
    expect(screen.queryByRole('button', { name: /Reabrir manifesto/i })).not.toBeInTheDocument();
  });

  it('não mostra "Reabrir manifesto" em manifesto não destinado', () => {
    renderCom('Professor');
    expect(screen.queryByRole('button', { name: /Reabrir manifesto/i })).not.toBeInTheDocument();
  });

  it('mostra a data de destinação na tabela', () => {
    comDestinado();
    renderCom('Professor');
    expect(screen.getAllByText('2026-08-01').length).toBeGreaterThan(0);
  });
});
