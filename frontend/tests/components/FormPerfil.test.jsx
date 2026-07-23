import { render, screen, fireEvent } from '@testing-library/react';
import { FormPerfil } from '../../src/forms/sistema';

const mutateMock = vi.fn();
vi.mock('../../src/auth/AuthContext', () => ({
  useAuth: () => ({
    user: { nome: 'Ana', email: 'ana@x.com', matricula: '123', papel: 'Tecnico' },
    updateUser: vi.fn(),
  }),
}));
vi.mock('../../src/auth/useAtualizarPerfil', () => ({
  useAtualizarPerfil: () => ({ mutate: mutateMock, isPending: false, isError: false }),
}));

beforeEach(() => mutateMock.mockClear());

test('editar nome e salvar chama mutate com Nome e Email', () => {
  render(<FormPerfil onClose={() => {}} />);
  fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Ana Souza' } });
  fireEvent.click(screen.getByRole('button', { name: /salvar/i }));
  expect(mutateMock).toHaveBeenCalled();
  expect(mutateMock.mock.calls[0][0]).toMatchObject({ Nome: 'Ana Souza', Email: 'ana@x.com' });
});

test('nome vazio bloqueia o submit', () => {
  render(<FormPerfil onClose={() => {}} />);
  fireEvent.change(screen.getByLabelText('Nome'), { target: { value: '  ' } });
  fireEvent.click(screen.getByRole('button', { name: /salvar/i }));
  expect(mutateMock).not.toHaveBeenCalled();
});
