// frontend/tests/components/ChamadosScreen.test.jsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChamadosScreen } from '../../src/screens/ChamadosScreen';
import { initialState } from '../../src/store/reducer';

vi.mock('../../src/auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../../src/chamados/useChamados', () => ({ useChamados: vi.fn() }));
vi.mock('../../src/chamados/useAtualizarStatusChamado', () => ({ useAtualizarStatusChamado: vi.fn() }));
vi.mock('../../src/chamados/useComentarChamado', () => ({ useComentarChamado: vi.fn() }));

import { useAuth } from '../../src/auth/AuthContext';
import { useChamados } from '../../src/chamados/useChamados';
import { useAtualizarStatusChamado } from '../../src/chamados/useAtualizarStatusChamado';
import { useComentarChamado } from '../../src/chamados/useComentarChamado';

const chamado = {
  id: 1,
  titulo: 'Capela com ruído',
  descricao: 'Exaustor barulhento',
  status: 'aberto',
  tipo: 'bug',
  severidade: 'media',
  laboratorioId: 'Lab-001',
  abertoPorId: 'u-1',
  criadoEm: '2026-07-30T12:00:00Z',
  comentarios: [
    { id: 10, texto: 'Comentário meu', autorId: 'u-1', criadoEm: '2026-07-30T12:05:00Z' },
    { id: 11, texto: 'Comentário de outro', autorId: 'u-2', criadoEm: '2026-07-30T12:06:00Z' },
    { id: 12, texto: 'Autor excluído', autorId: null, criadoEm: '2026-07-30T12:07:00Z' },
  ],
};

beforeEach(() => {
  useAuth.mockReturnValue({ user: { id: 'u-1', papel: 'Tecnico' } });
  useChamados.mockReturnValue({ data: [chamado], isPending: false, isError: false, refetch: vi.fn() });
  useAtualizarStatusChamado.mockReturnValue({ mutate: vi.fn(), isPending: false });
  useComentarChamado.mockReturnValue({ mutate: vi.fn(), isPending: false });
});

afterEach(() => vi.clearAllMocks());

describe('ChamadosScreen — autoria dos comentários', () => {
  const abrirDetalhe = () => {
    render(<ChamadosScreen state={initialState} dispatch={vi.fn()} />);
    fireEvent.click(screen.getByText('Capela com ruído'));
  };

  it('marca como "eu" só o comentário do usuário autenticado', () => {
    abrirDetalhe();
    expect(screen.getByText('Comentário meu')).toHaveClass('eu');
  });

  it('marca comentário de outro usuário como "outro"', () => {
    abrirDetalhe();
    expect(screen.getByText('Comentário de outro')).toHaveClass('outro');
  });

  it('trata autor excluído (autorId null) como outro', () => {
    abrirDetalhe();
    expect(screen.getByText('Autor excluído')).toHaveClass('outro');
  });
});
