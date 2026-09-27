import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LaboratoriosScreen } from '../../src/screens/LaboratoriosScreen';
import { initialState } from '../../src/store/reducer';

const mockReturn = {
  data: [
    {
      id: 'Lab-001', nome: 'Química Inorgânica', responsavel: 'Profa. Ana Lima',
      sala: 'Bloco IMC · 2º andar · Sala 201',
      armarios: ['Armário A', 'Armário B'], cor: '#1465c0',
      criado: '2024-01-01',
    },
    {
      id: 'Lab-002', nome: 'Química Orgânica', responsavel: 'Prof. Renan Costa',
      sala: 'Bloco IMC · 2º andar · Sala 203',
      armarios: ['Armário Inflamáveis'], cor: '#b76e00',
      criado: '2024-01-01',
    },
  ],
  isPending: false,
  isError: false,
  refetch: vi.fn(),
};

const LAB_IDS = mockReturn.data.map(l => l.id);

vi.mock('../../src/laboratorios/useLaboratorios', () => ({
  useLaboratorios: vi.fn(),
}));
vi.mock('../../src/auth/AuthContext', () => ({ useAuth: vi.fn() }));

import { useLaboratorios } from '../../src/laboratorios/useLaboratorios';
import { useAuth } from '../../src/auth/AuthContext';

beforeEach(() => {
  useLaboratorios.mockReturnValue(mockReturn);
  useAuth.mockReturnValue({ user: { id: 'u-1', papel: 'Professor', laboratorioIds: LAB_IDS } });
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

  it('card mostra só localização, responsável e armários', () => {
    render(<LaboratoriosScreen state={initialState} dispatch={vi.fn()} />);
    expect(screen.getByText('Bloco IMC · 2º andar · Sala 201')).toBeInTheDocument();
    expect(screen.getByText('resp. Ana Lima')).toBeInTheDocument();
    expect(screen.getByText('Armário Inflamáveis')).toBeInTheDocument();
    expect(screen.queryByText(/m²|alunos|Capacidade/)).not.toBeInTheDocument();
  });

  it('omite a tag de responsável quando ele está em branco', () => {
    useLaboratorios.mockReturnValue({
      ...mockReturn,
      data: [{ ...mockReturn.data[0], responsavel: '' }],
    });
    render(<LaboratoriosScreen state={initialState} dispatch={vi.fn()} />);
    expect(screen.queryByText(/^resp\./)).not.toBeInTheDocument();
  });

  it('exibe estado de loading quando isPending=true', () => {
    useLaboratorios.mockReturnValue({ data: [], isPending: true, isError: false, refetch: vi.fn() });
    render(<LaboratoriosScreen state={initialState} dispatch={vi.fn()} />);
    expect(screen.queryByText('Química Inorgânica')).not.toBeInTheDocument();
  });
});

// POST/PUT /api/laboratorios exigem a policy Cadastro; DELETE exige Administracao.
describe('LaboratoriosScreen — permissões', () => {
  const renderCom = (papel) => {
    useAuth.mockReturnValue({ user: { id: 'u-1', papel, laboratorioIds: LAB_IDS } });
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

  it('esconde editar e remover do laboratório pelo qual o Professor não responde', () => {
    useAuth.mockReturnValue({ user: { id: 'u-1', papel: 'Professor', laboratorioIds: [] } });
    render(<LaboratoriosScreen state={initialState} dispatch={vi.fn()} />);

    expect(screen.getByRole('button', { name: /Novo laboratório/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar laboratório' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remover laboratório' })).not.toBeInTheDocument();
  });
});
