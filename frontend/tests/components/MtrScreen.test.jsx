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
  it('lista os MTRs emitidos', () => {
    renderCom('Admin');
    expect(screen.getAllByText('MTR-2026-0001').length).toBeGreaterThan(0);
  });

  // POST /api/mtrs exige a policy Tecnico.
  it.each(['Admin', 'Gestor', 'Tecnico'])('mostra "Novo Pré-MTR" para %s', (papel) => {
    renderCom(papel);
    expect(screen.getByRole('button', { name: /Novo Pré-MTR/i })).toBeInTheDocument();
  });

  it.each(['Professor', 'Pesquisador', 'Visualizador'])('esconde "Novo Pré-MTR" de %s', (papel) => {
    renderCom(papel);
    expect(screen.queryByRole('button', { name: /Novo Pré-MTR/i })).not.toBeInTheDocument();
  });

  it('mostra litros e quilos do manifesto', () => {
    renderCom('Admin');
    expect(screen.getAllByText(/30\.00 L · 12\.50 kg/).length).toBeGreaterThan(0);
  });

  it('mantém a lista visível para quem não pode emitir', () => {
    renderCom('Visualizador');
    expect(screen.getAllByText('MTR-2026-0001').length).toBeGreaterThan(0);
  });
});

const destinado = { ...mtr, id: 2, numero: 'MTR-2026-0002', data_destinacao: '2026-08-01' };
const comDestinado = () =>
  useMtrs.mockReturnValue({ data: [destinado], isPending: false, isError: false, refetch: vi.fn() });

describe('MtrScreen · destinação', () => {
  // POST /api/mtrs/:id/destinacao exige a policy Tecnico.
  it.each(['Admin', 'Gestor', 'Tecnico'])('mostra "Confirmar destinação" para %s', (papel) => {
    renderCom(papel);
    expect(screen.getByRole('button', { name: /Confirmar destinação/i })).toBeInTheDocument();
  });

  it.each(['Professor', 'Pesquisador', 'Visualizador'])('esconde "Confirmar destinação" de %s', (papel) => {
    renderCom(papel);
    expect(screen.queryByRole('button', { name: /Confirmar destinação/i })).not.toBeInTheDocument();
  });

  it('esconde "Confirmar destinação" de manifesto já destinado', () => {
    comDestinado();
    renderCom('Admin');
    expect(screen.queryByRole('button', { name: /Confirmar destinação/i })).not.toBeInTheDocument();
  });

  // DELETE exige Gestor: Tecnico confirma, mas não reabre.
  it('mostra "Reabrir manifesto" para Gestor em manifesto destinado', () => {
    comDestinado();
    renderCom('Gestor');
    expect(screen.getByRole('button', { name: /Reabrir manifesto/i })).toBeInTheDocument();
  });

  it('esconde "Reabrir manifesto" de Tecnico', () => {
    comDestinado();
    renderCom('Tecnico');
    expect(screen.queryByRole('button', { name: /Reabrir manifesto/i })).not.toBeInTheDocument();
  });

  it('não mostra "Reabrir manifesto" em manifesto não destinado', () => {
    renderCom('Gestor');
    expect(screen.queryByRole('button', { name: /Reabrir manifesto/i })).not.toBeInTheDocument();
  });

  it('mostra a data de destinação na tabela', () => {
    comDestinado();
    renderCom('Admin');
    expect(screen.getAllByText('2026-08-01').length).toBeGreaterThan(0);
  });
});
