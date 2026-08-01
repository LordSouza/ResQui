// frontend/tests/components/MtrScreen.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MtrScreen } from '../../src/screens/MtrScreen';
import { initialState } from '../../src/store/reducer';

vi.mock('../../src/auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../../src/mtrs/useMtrs', () => ({ useMtrs: vi.fn() }));
vi.mock('../../src/residuos/useResíduos', () => ({ useResíduos: vi.fn() }));

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
  massa: 12.5,
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

  it('mantém a lista visível para quem não pode emitir', () => {
    renderCom('Visualizador');
    expect(screen.getAllByText('MTR-2026-0001').length).toBeGreaterThan(0);
  });
});
