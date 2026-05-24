import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InventarioScreen } from '../../src/screens/InventarioScreen';
import { initialState } from '../../src/store/reducer';

describe('InventarioScreen', () => {
  it('renders the page title', () => {
    render(<InventarioScreen state={initialState} dispatch={vi.fn()} />);
    expect(screen.getByText('Inventário de reagentes')).toBeInTheDocument();
  });

  it('shows the first reagent from data', () => {
    render(<InventarioScreen state={initialState} dispatch={vi.fn()} />);
    expect(screen.getByText('Ácido Clorídrico')).toBeInTheDocument();
  });

  it('filters by name when search input is typed', async () => {
    render(<InventarioScreen state={initialState} dispatch={vi.fn()} />);
    const input = screen.getByPlaceholderText(/Buscar por nome/i);
    await userEvent.type(input, 'Sulfúrico');
    expect(screen.getByText('Ácido Sulfúrico')).toBeInTheDocument();
    expect(screen.queryByText('Ácido Clorídrico')).not.toBeInTheDocument();
  });

  it('dispatches detail action when a reagent row is clicked', async () => {
    const dispatch = vi.fn();
    render(<InventarioScreen state={initialState} dispatch={dispatch} />);
    await userEvent.click(screen.getByText('Ácido Clorídrico'));
    expect(dispatch).toHaveBeenCalledWith({ type: 'detail', id: 'R-00128' });
  });

  it('dispatches openModal novoReagente when Novo reagente button is clicked', async () => {
    const dispatch = vi.fn();
    render(<InventarioScreen state={initialState} dispatch={dispatch} />);
    await userEvent.click(screen.getByRole('button', { name: /Novo reagente/i }));
    expect(dispatch).toHaveBeenCalledWith({ type: 'openModal', kind: 'novoReagente' });
  });

  it('dispatches openModal importarCsv when Importar CSV button is clicked', async () => {
    const dispatch = vi.fn();
    render(<InventarioScreen state={initialState} dispatch={dispatch} />);
    await userEvent.click(screen.getByRole('button', { name: /Importar CSV/i }));
    expect(dispatch).toHaveBeenCalledWith({ type: 'openModal', kind: 'importarCsv' });
  });
});
