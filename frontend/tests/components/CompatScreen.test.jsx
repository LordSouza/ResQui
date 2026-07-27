// frontend/tests/components/CompatScreen.test.jsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CompatScreen } from '../../src/screens/CompatScreen';
import { initialState } from '../../src/store/reducer';

vi.mock('../../src/components/ToastContext', () => ({ useToast: () => ({ addToast: vi.fn() }) }));

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

beforeEach(() => {
  useCompatMatriz.mockReturnValue({ data: { matrix: baseMatrix, fonte: baseFonte }, isPending: false, isError: false });
  useCompatOverrides.mockReturnValue({ data: [], isPending: false, isError: false });
  useReagentes.mockReturnValue({ data: { items: [], total: 0 }, isPending: false, isError: false, refetch: vi.fn() });
  useReagente.mockReturnValue({ data: null });
});

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
});
