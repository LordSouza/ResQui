import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LaboratoriosScreen } from '../../src/screens/LaboratoriosScreen';
import { initialState } from '../../src/store/reducer';

describe('LaboratoriosScreen', () => {
  beforeEach(() => {
    global.URL.createObjectURL = vi.fn(() => 'blob:test');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the page title', () => {
    render(<LaboratoriosScreen state={initialState} dispatch={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Laboratórios' })).toBeInTheDocument();
  });

  it('shows all 5 laboratory names', () => {
    render(<LaboratoriosScreen state={initialState} dispatch={vi.fn()} />);
    expect(screen.getByText('Química Inorgânica')).toBeInTheDocument();
    expect(screen.getByText('Química Orgânica')).toBeInTheDocument();
    expect(screen.getByText('Análise Instrumental')).toBeInTheDocument();
    expect(screen.getByText('Laboratório de Apoio')).toBeInTheDocument();
    expect(screen.getByText('Físico-Química')).toBeInTheDocument();
  });

  it('dispatches openModal novoLab when Novo laboratório button is clicked', async () => {
    const dispatch = vi.fn();
    render(<LaboratoriosScreen state={initialState} dispatch={dispatch} />);
    await userEvent.click(screen.getByRole('button', { name: /Novo laboratório/i }));
    expect(dispatch).toHaveBeenCalledWith({ type: 'openModal', kind: 'novoLab' });
  });
});
