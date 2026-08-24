import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmRejeitarResiduo } from '../../src/forms/residuos';

const mutateMock = vi.fn((vars, opts) => opts?.onSuccess?.());
vi.mock('../../src/residuos/useRejeitarResiduo', () => ({
  useRejeitarResiduo: () => ({ mutate: mutateMock, isPending: false }),
}));

const residuo = { id: 9, tipo: 'Solventes orgânicos' };

beforeEach(() => { mutateMock.mockClear(); });

describe('ConfirmRejeitarResiduo', () => {
  it('envia o motivo digitado', () => {
    render(<ConfirmRejeitarResiduo residuo={residuo} onClose={vi.fn()} dispatch={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Motivo/), { target: { value: 'Frasco sem rótulo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Rejeitar descarte' }));
    expect(mutateMock).toHaveBeenCalledWith(
      { id: 9, motivo: 'Frasco sem rótulo' },
      expect.anything(),
    );
  });

  it('motivo em branco vira null', () => {
    render(<ConfirmRejeitarResiduo residuo={residuo} onClose={vi.fn()} dispatch={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Rejeitar descarte' }));
    expect(mutateMock).toHaveBeenCalledWith(
      { id: 9, motivo: null },
      expect.anything(),
    );
  });

  it('ao ter sucesso, atualiza a lista e fecha o modal', () => {
    const onClose = vi.fn();
    const dispatch = vi.fn();
    render(<ConfirmRejeitarResiduo residuo={residuo} onClose={onClose} dispatch={dispatch} />);
    fireEvent.click(screen.getByRole('button', { name: 'Rejeitar descarte' }));
    expect(dispatch).toHaveBeenCalledWith({ type: 'refresh' });
    expect(onClose).toHaveBeenCalled();
  });
});
