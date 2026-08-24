// frontend/tests/components/ResiduosScreen.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResiduosScreen } from '../../src/screens/ResiduosScreen';
import { initialState } from '../../src/store/reducer';

vi.mock('../../src/auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../../src/residuos/useResíduos', () => ({ useResíduos: vi.fn() }));
vi.mock('../../src/residuos/useAprovarResiduo', () => ({ useAprovarResiduo: vi.fn() }));
vi.mock('../../src/residuos/useRejeitarResiduo', () => ({ useRejeitarResiduo: vi.fn() }));

import { useAuth } from '../../src/auth/AuthContext';
import { useResíduos } from '../../src/residuos/useResíduos';
import { useAprovarResiduo } from '../../src/residuos/useAprovarResiduo';
import { useRejeitarResiduo } from '../../src/residuos/useRejeitarResiduo';

const residuo = {
  id: 7,
  tipo: 'Solventes orgânicos não-halogenados',
  composicao: 'Acetona + Etanol',
  lab_id: 'Lab-001',
  volume: 4.2,
  unidade: 'L',
  risco: 'medio',
  status: 'aguardando-coleta',
  data_registro: '2026-07-20T10:00:00',
  mtr_id: null,
};

const renderCom = (papel) => {
  useAuth.mockReturnValue({ user: { id: 'u-1', papel } });
  return render(<ResiduosScreen state={initialState} dispatch={vi.fn()} />);
};

beforeEach(() => {
  useResíduos.mockReturnValue({ data: [residuo], isPending: false, isError: false, refetch: vi.fn() });
  useAprovarResiduo.mockReturnValue({ mutate: vi.fn(), isPending: false });
  useRejeitarResiduo.mockReturnValue({ mutate: vi.fn(), isPending: false });
});

describe('ResiduosScreen — botão Editar respeita a policy Tecnico', () => {
  // PUT /api/residuos/:id exige a policy Tecnico (Admin, Gestor, Tecnico).
  it.each(['Admin', 'Gestor', 'Tecnico'])('mostra "Editar" para %s', (papel) => {
    renderCom(papel);
    expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument();
  });

  // Pesquisador e Professor têm apenas Operacional (criam resíduo, não editam);
  // Visualizador não tem nenhuma das duas.
  it.each(['Pesquisador', 'Professor', 'Visualizador'])('esconde "Editar" para %s', (papel) => {
    renderCom(papel);
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
  });

  // POST /api/residuos exige Operacional — todos menos Visualizador.
  it.each(['Admin', 'Gestor', 'Tecnico', 'Pesquisador', 'Professor'])('mostra "Registrar resíduo" para %s', (papel) => {
    renderCom(papel);
    expect(screen.getByRole('button', { name: /Registrar resíduo/i })).toBeInTheDocument();
  });

  it('esconde "Registrar resíduo" de Visualizador', () => {
    renderCom('Visualizador');
    expect(screen.queryByRole('button', { name: /Registrar resíduo/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Exportar lista/i })).toBeInTheDocument();
  });

  it('mantém Aprovar/Rejeitar para Professor, que os tem por policy Aprovador', () => {
    useResíduos.mockReturnValue({
      data: [{ ...residuo, status: 'solicitado' }],
      isPending: false, isError: false, refetch: vi.fn(),
    });
    renderCom('Professor');
    expect(screen.getByRole('button', { name: 'Aprovar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rejeitar' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
  });

  it('não oferece a aba Rotulagem — status que não existe na API', () => {
    renderCom('Admin');
    expect(screen.getByText(/Resíduos químicos/)).toBeInTheDocument();
    expect(screen.queryByText('Rotulagem')).not.toBeInTheDocument();
  });
});
