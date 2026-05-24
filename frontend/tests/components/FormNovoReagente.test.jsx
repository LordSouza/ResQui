import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormNovoReagente } from '../../src/forms/reagentes';
import { REAGENTES, AUDITORIA } from '../../src/data';

describe('FormNovoReagente', () => {
  let onClose;
  let dispatch;
  let reagentesSnapshot;
  let auditoriaSnapshot;

  beforeEach(() => {
    onClose = vi.fn();
    dispatch = vi.fn();
    reagentesSnapshot = REAGENTES.length;
    auditoriaSnapshot = AUDITORIA.length;
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    while (REAGENTES.length > reagentesSnapshot) REAGENTES.shift();
    while (AUDITORIA.length > auditoriaSnapshot) AUDITORIA.shift();
    vi.restoreAllMocks();
  });

  it('renders the form title', () => {
    render(<FormNovoReagente onClose={onClose} dispatch={dispatch} />);
    expect(screen.getByText('Novo reagente')).toBeInTheDocument();
  });

  it('shows alert and does not call onClose when nome is empty', async () => {
    render(<FormNovoReagente onClose={onClose} dispatch={dispatch} />);
    await userEvent.click(screen.getByRole('button', { name: /Cadastrar reagente/i }));
    expect(window.alert).toHaveBeenCalledWith('Nome e CAS são obrigatórios.');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not dispatch when validation fails', async () => {
    render(<FormNovoReagente onClose={onClose} dispatch={dispatch} />);
    await userEvent.click(screen.getByRole('button', { name: /Cadastrar reagente/i }));
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('adds a new reagent to REAGENTES on valid submit', async () => {
    render(<FormNovoReagente onClose={onClose} dispatch={dispatch} />);
    await userEvent.type(screen.getByPlaceholderText(/ex: Ácido Acético/i), 'Reagente Teste');
    await userEvent.type(screen.getByPlaceholderText('64-19-7'), '9999-99-9');
    await userEvent.click(screen.getByRole('button', { name: /Cadastrar reagente/i }));
    expect(REAGENTES[0].nome).toBe('Reagente Teste');
    expect(REAGENTES[0].cas).toBe('9999-99-9');
  });

  it('calls dispatch with refresh action on valid submit', async () => {
    render(<FormNovoReagente onClose={onClose} dispatch={dispatch} />);
    await userEvent.type(screen.getByPlaceholderText(/ex: Ácido Acético/i), 'Reagente Teste');
    await userEvent.type(screen.getByPlaceholderText('64-19-7'), '9999-99-9');
    await userEvent.click(screen.getByRole('button', { name: /Cadastrar reagente/i }));
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'refresh' }));
  });

  it('calls onClose on valid submit', async () => {
    render(<FormNovoReagente onClose={onClose} dispatch={dispatch} />);
    await userEvent.type(screen.getByPlaceholderText(/ex: Ácido Acético/i), 'Reagente Teste');
    await userEvent.type(screen.getByPlaceholderText('64-19-7'), '9999-99-9');
    await userEvent.click(screen.getByRole('button', { name: /Cadastrar reagente/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when Cancelar is clicked', async () => {
    render(<FormNovoReagente onClose={onClose} dispatch={dispatch} />);
    await userEvent.click(screen.getByRole('button', { name: /Cancelar/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
