import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FormConfirmarDestinacao, ConfirmReabrirDestinacao } from '../../src/forms/residuos';

const confirmar = vi.fn();
const reabrir = vi.fn();
vi.mock('../../src/mtrs/useConfirmarDestinacao', () => ({ useConfirmarDestinacao: () => ({ mutate: confirmar, isPending: false }) }));
vi.mock('../../src/mtrs/useReabrirDestinacao', () => ({ useReabrirDestinacao: () => ({ mutate: reabrir, isPending: false }) }));

const mtr = { id: 3, numero: 'MTR-2026-0003', data_destinacao: '2026-08-01', residuo_ids: [1, 2, 3] };
const residuos = [
  { id: 1, status: 'em-coleta' },
  { id: 2, status: 'em-coleta' },
  { id: 3, status: 'rejeitado' },
];

beforeEach(() => { confirmar.mockClear(); reabrir.mockClear(); });

describe('FormConfirmarDestinacao', () => {
  it('conta só os resíduos em coleta', () => {
    render(<FormConfirmarDestinacao mtr={mtr} residuos={residuos} onClose={vi.fn()} />);
    expect(screen.getByText(/2 resíduo\(s\) em coleta/)).toBeInTheDocument();
  });

  it('não conta quando a lista está recortada pelo escopo — a destinação alcança o manifesto inteiro', () => {
    render(<FormConfirmarDestinacao mtr={{ ...mtr, residuo_ids: [1, 2, 3, 4, 5, 6] }}
      residuos={residuos} onClose={vi.fn()} />);

    expect(screen.queryByText(/2 resíduo\(s\) em coleta/)).not.toBeInTheDocument();
    expect(screen.getByText(/Todos os resíduos deste manifesto que estiverem em coleta/)).toBeInTheDocument();
  });

  it('envia o id e a data escolhida', () => {
    render(<FormConfirmarDestinacao mtr={mtr} residuos={residuos} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Data da destinação/), { target: { value: '2026-08-02' } });
    fireEvent.click(screen.getByRole('button', { name: /^Confirmar$/ }));

    expect(confirmar).toHaveBeenCalledWith({ id: 3, data: '2026-08-02' }, expect.anything());
  });
});

describe('ConfirmReabrirDestinacao', () => {
  it('conta os destinados e dispara a reabertura', () => {
    render(<ConfirmReabrirDestinacao mtr={{ ...mtr, residuo_ids: [1] }}
      residuos={[{ id: 1, status: 'destinado' }]} onClose={vi.fn()} />);
    expect(screen.getByText(/1 resíduo\(s\) voltam/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Reabrir$/ }));
    expect(reabrir).toHaveBeenCalledWith(3, expect.anything());
  });

  it('não conta quando a lista está recortada pelo escopo', () => {
    render(<ConfirmReabrirDestinacao mtr={mtr} residuos={[{ id: 1, status: 'destinado' }]} onClose={vi.fn()} />);
    expect(screen.queryByText(/1 resíduo\(s\) voltam/)).not.toBeInTheDocument();
    expect(screen.getByText(/Todos os resíduos destinados deste manifesto/)).toBeInTheDocument();
  });
});
