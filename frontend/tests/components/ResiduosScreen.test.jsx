// frontend/tests/components/ResiduosScreen.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ResiduosScreen } from '../../src/screens/ResiduosScreen';
import { initialState } from '../../src/store/reducer';

vi.mock('../../src/auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../../src/residuos/useResíduos', () => ({ useResíduos: vi.fn() }));
vi.mock('../../src/residuos/useAprovarResiduo', () => ({ useAprovarResiduo: vi.fn() }));

import { useAuth } from '../../src/auth/AuthContext';
import { useResíduos } from '../../src/residuos/useResíduos';
import { useAprovarResiduo } from '../../src/residuos/useAprovarResiduo';

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
});

describe('ResiduosScreen — botão Editar respeita a policy Operacao', () => {
  // PUT /api/residuos/:id exige a policy Operacao, que só o Professor tem.
  it.each(['Professor', 'Professor', 'Professor'])('mostra "Editar" para %s', (papel) => {
    renderCom(papel);
    expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument();
  });

  // Aluno tem apenas Operacional: cria resíduo, não edita.
  it('esconde "Editar" para Aluno', () => {
    renderCom('Aluno');
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
  });

  // POST /api/residuos exige Operacional, que os dois papéis têm.
  it.each(['Professor', 'Aluno'])('mostra "Registrar resíduo" para %s', (papel) => {
    renderCom(papel);
    expect(screen.getByRole('button', { name: /Registrar resíduo/i })).toBeInTheDocument();
  });

  it('mantém Aprovar/Rejeitar e Editar para Professor', () => {
    useResíduos.mockReturnValue({
      data: [{ ...residuo, status: 'solicitado' }],
      isPending: false, isError: false, refetch: vi.fn(),
    });
    renderCom('Professor');
    expect(screen.getByRole('button', { name: 'Aprovar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rejeitar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument();
  });

  it('esconde Aprovar/Rejeitar de Aluno', () => {
    useResíduos.mockReturnValue({
      data: [{ ...residuo, status: 'solicitado' }],
      isPending: false, isError: false, refetch: vi.fn(),
    });
    renderCom('Aluno');
    expect(screen.queryByRole('button', { name: 'Aprovar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rejeitar' })).not.toBeInTheDocument();
  });

  it('rejeitar abre modal em vez de window.prompt', () => {
    useResíduos.mockReturnValue({
      data: [{ ...residuo, status: 'solicitado' }],
      isPending: false, isError: false, refetch: vi.fn(),
    });
    useAuth.mockReturnValue({ user: { id: 'u-1', papel: 'Professor' } });
    const dispatch = vi.fn();
    render(<ResiduosScreen state={initialState} dispatch={dispatch} />);
    fireEvent.click(screen.getByRole('button', { name: 'Rejeitar' }));
    expect(dispatch).toHaveBeenCalledWith({
      type: 'openModal',
      kind: 'rejeitarResiduo',
      residuo: expect.objectContaining({ id: residuo.id }),
    });
  });

  it('não oferece a aba Rotulagem — status que não existe na API', () => {
    renderCom('Professor');
    expect(screen.getByText(/Resíduos químicos/)).toBeInTheDocument();
    expect(screen.queryByText('Rotulagem')).not.toBeInTheDocument();
  });
});

describe('ResiduosScreen — ciclo como stepper', () => {
  it('mostra o ciclo em ordem e explica a etapa ativa', () => {
    useResíduos.mockReturnValue({ data: [], isPending: false, isError: false, refetch: vi.fn() });
    renderCom('Professor');
    expect(screen.getByText('Aguardando coleta')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Solicitado'));
    expect(screen.getByText(/Aguardando aprovação de um professor ou gestor/)).toBeInTheDocument();
  });
});

describe('ResiduosScreen — filtro inicial da navegação', () => {
  it('abre com o filtro vindo da navegação', () => {
    useResíduos.mockReturnValue({
      data: [
        { id: 1, tipo: 'Solventes', status: 'solicitado', composicao: 'x', lab_id: 'Lab-001', volume: 1, unidade: 'L', risco: 'baixo', data_registro: '2026-08-24T10:00:00', mtr_id: null },
        { id: 2, tipo: 'Ácidos', status: 'destinado', composicao: 'y', lab_id: 'Lab-001', volume: 1, unidade: 'L', risco: 'baixo', data_registro: '2026-08-24T10:00:00', mtr_id: null },
      ],
      isPending: false, isError: false, refetch: vi.fn(),
    });
    useAuth.mockReturnValue({ user: { id: 'u-1', papel: 'Professor' } });
    render(<ResiduosScreen state={{ residuosStatusInicial: 'solicitado' }} dispatch={vi.fn()} />);
    expect(screen.getByText('Solventes')).toBeInTheDocument();
    expect(screen.queryByText('Ácidos')).not.toBeInTheDocument();
  });
});

describe('ResiduosScreen — próximo passo do ciclo como botão', () => {
  it('na etapa aguardando-coleta oferece criar o manifesto', () => {
    useResíduos.mockReturnValue({
      data: [{ ...residuo, status: 'aguardando-coleta' }],
      isPending: false, isError: false, refetch: vi.fn(),
    });
    useAuth.mockReturnValue({ user: { id: 'u-1', papel: 'Professor' } });
    const dispatch = vi.fn();
    render(<ResiduosScreen state={{ residuosStatusInicial: 'aguardando-coleta' }} dispatch={dispatch} />);
    fireEvent.click(screen.getByText(/Criar manifesto de coleta/));
    expect(dispatch).toHaveBeenCalledWith({ type: 'openModal', kind: 'novoMtr' });
  });

  it('na etapa em-coleta oferece confirmar destinação nos manifestos', () => {
    useResíduos.mockReturnValue({
      data: [{ ...residuo, status: 'em-coleta' }],
      isPending: false, isError: false, refetch: vi.fn(),
    });
    useAuth.mockReturnValue({ user: { id: 'u-1', papel: 'Professor' } });
    const dispatch = vi.fn();
    render(<ResiduosScreen state={{ residuosStatusInicial: 'em-coleta' }} dispatch={dispatch} />);
    fireEvent.click(screen.getByText(/Confirmar destinação nos manifestos/));
    expect(dispatch).toHaveBeenCalledWith({ type: 'nav', screen: 'mtr' });
  });

  it('esconde o CTA de Aluno, que não tem a policy Operacao', () => {
    useResíduos.mockReturnValue({
      data: [{ ...residuo, status: 'aguardando-coleta' }],
      isPending: false, isError: false, refetch: vi.fn(),
    });
    useAuth.mockReturnValue({ user: { id: 'u-1', papel: 'Aluno' } });
    render(<ResiduosScreen state={{ residuosStatusInicial: 'aguardando-coleta' }} dispatch={vi.fn()} />);
    expect(screen.queryByText(/Criar manifesto de coleta/)).not.toBeInTheDocument();
  });

  it('não oferece CTA quando não há resíduo na etapa', () => {
    useResíduos.mockReturnValue({ data: [], isPending: false, isError: false, refetch: vi.fn() });
    useAuth.mockReturnValue({ user: { id: 'u-1', papel: 'Professor' } });
    render(<ResiduosScreen state={{ residuosStatusInicial: 'aguardando-coleta' }} dispatch={vi.fn()} />);
    expect(screen.queryByText(/Criar manifesto de coleta/)).not.toBeInTheDocument();
  });
});
