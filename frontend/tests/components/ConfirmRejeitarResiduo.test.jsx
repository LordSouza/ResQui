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

  it('não envia sem motivo: o botão fica desabilitado enquanto o campo estiver em branco', () => {
    render(<ConfirmRejeitarResiduo residuo={residuo} onClose={vi.fn()} dispatch={vi.fn()} />);
    const botao = screen.getByRole('button', { name: 'Rejeitar descarte' });
    expect(botao).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Motivo/), { target: { value: '   ' } });
    expect(botao).toBeDisabled();
    fireEvent.click(botao);
    expect(mutateMock).not.toHaveBeenCalled();
  });

  it('diz onde o motivo aparece', () => {
    render(<ConfirmRejeitarResiduo residuo={residuo} onClose={vi.fn()} dispatch={vi.fn()} />);
    expect(screen.getByLabelText(/Motivo/)).toHaveAccessibleDescription(/Aparece na lista de resíduos/);
  });

  it('ao ter sucesso, atualiza a lista e fecha o modal', () => {
    const onClose = vi.fn();
    const dispatch = vi.fn();
    render(<ConfirmRejeitarResiduo residuo={residuo} onClose={onClose} dispatch={dispatch} />);
    fireEvent.change(screen.getByLabelText(/Motivo/), { target: { value: 'Frasco sem rótulo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Rejeitar descarte' }));
    expect(dispatch).toHaveBeenCalledWith({ type: 'refresh' });
    expect(onClose).toHaveBeenCalled();
  });
});
