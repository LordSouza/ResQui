import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LaboratoriosScreen } from '../../src/screens/LaboratoriosScreen';
import { initialState } from '../../src/store/reducer';

const mockReturn = {
  data: [
    {
      id: 'Lab-001', nome: 'Química Inorgânica', responsavel: 'Profa. Ana Lima',
      email: null, sala: 'Bloco IMC · 2º andar · Sala 201',
      areas: ['Ácidos'], armarios: ['Armário A', 'Armário B'],
      capacidade: 30, area_m2: 52.5, ventilacao: 'chapel', cor: '#1465c0',
      criado: '2024-01-01',
    },
    {
      id: 'Lab-002', nome: 'Química Orgânica', responsavel: 'Prof. Renan Costa',
      email: null, sala: 'Bloco IMC · 2º andar · Sala 203',
      areas: [], armarios: ['Armário Inflamáveis'],
      capacidade: 40, area_m2: 58.0, ventilacao: 'chapel', cor: '#b76e00',
      criado: '2024-01-01',
    },
  ],
  isPending: false,
  isError: false,
  refetch: vi.fn(),
};

vi.mock('../../src/laboratorios/useLaboratorios', () => ({
  useLaboratorios: vi.fn(),
}));
vi.mock('../../src/auth/AuthContext', () => ({ useAuth: vi.fn() }));

import { useLaboratorios } from '../../src/laboratorios/useLaboratorios';
import { useAuth } from '../../src/auth/AuthContext';

beforeEach(() => {
  useLaboratorios.mockReturnValue(mockReturn);
  useAuth.mockReturnValue({ user: { id: 'u-1', papel: 'Professor' } });
});

describe('LaboratoriosScreen', () => {
  it('renders the page title', () => {
    render(<LaboratoriosScreen state={initialState} dispatch={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Laboratórios' })).toBeInTheDocument();
  });

  it('shows lab names from API', () => {
    render(<LaboratoriosScreen state={initialState} dispatch={vi.fn()} />);
    expect(screen.getByText('Química Inorgânica')).toBeInTheDocument();
    expect(screen.getByText('Química Orgânica')).toBeInTheDocument();
  });

  it('dispatches openModal novoLab when Novo laboratório button is clicked', async () => {
    const dispatch = vi.fn();
    render(<LaboratoriosScreen state={initialState} dispatch={dispatch} />);
    await userEvent.click(screen.getByRole('button', { name: /Novo laboratório/i }));
    expect(dispatch).toHaveBeenCalledWith({ type: 'openModal', kind: 'novoLab' });
  });

  it('exibe estado de loading quando isPending=true', () => {
    useLaboratorios.mockReturnValue({ data: [], isPending: true, isError: false, refetch: vi.fn() });
    render(<LaboratoriosScreen state={initialState} dispatch={vi.fn()} />);
    expect(screen.queryByText('Química Inorgânica')).not.toBeInTheDocument();
  });
});

// POST/PUT /api/laboratorios exigem a policy Gestor; DELETE exige Admin.
describe('LaboratoriosScreen — permissões', () => {
  const renderCom = (papel) => {
    useAuth.mockReturnValue({ user: { id: 'u-1', papel } });
    return render(<LaboratoriosScreen state={initialState} dispatch={vi.fn()} />);
  };

  it.each(['Professor', 'Professor'])('mostra criar e editar para %s', (papel) => {
    renderCom(papel);
    expect(screen.getByRole('button', { name: /Novo laboratório/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Editar laboratório' }).length).toBeGreaterThan(0);
  });

  it('esconde criar e editar de Aluno', () => {
    renderCom('Aluno');
    expect(screen.queryByRole('button', { name: /Novo laboratório/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar laboratório' })).not.toBeInTheDocument();
  });

  it('mostra criar e remover para Professor', () => {
    renderCom('Professor');
    expect(screen.getByRole('button', { name: /Novo laboratório/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Remover laboratório' }).length).toBeGreaterThan(0);
  });

  it('esconde criar e remover de Aluno', () => {
    renderCom('Aluno');
    expect(screen.queryByRole('button', { name: /Novo laboratório/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remover laboratório' })).not.toBeInTheDocument();
  });

  it('esconde o atalho de cadastro do estado vazio para quem não pode criar', () => {
    useLaboratorios.mockReturnValue({ data: [], isPending: false, isError: false, refetch: vi.fn() });
    renderCom('Aluno');
    expect(screen.queryByRole('button', { name: /Cadastrar primeiro laboratório/i })).not.toBeInTheDocument();
  });
});
