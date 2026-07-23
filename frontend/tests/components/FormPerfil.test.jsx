import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormPerfil } from '../../src/forms/sistema';

vi.mock('../../src/auth/AuthContext', () => ({
  useAuth: () => ({ user: { nome: 'Ana Lima', email: 'ana@x.com', matricula: '999', papel: 'Gestor' } }),
}));

describe('FormPerfil — exibe o usuário real', () => {
  it('mostra nome, e-mail, matrícula e papel reais em campos read-only', () => {
    render(<FormPerfil onClose={vi.fn()} />);
    expect(screen.getByDisplayValue('Ana Lima')).toHaveAttribute('readonly');
    expect(screen.getByDisplayValue('ana@x.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('999')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Gestor')).toBeInTheDocument();
  });

  it('tem botão Fechar e não tem Salvar; remove campos sem fonte', () => {
    render(<FormPerfil onClose={vi.fn()} />);
    expect(screen.getByText('Fechar')).toBeInTheDocument();
    expect(screen.queryByText(/Salvar/)).toBeNull();
    expect(screen.queryByLabelText('Registro CRQ')).toBeNull();
    expect(screen.queryByLabelText('Bio / Observações')).toBeNull();
  });
});
