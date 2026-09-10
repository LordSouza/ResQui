import { render, screen, fireEvent } from '@testing-library/react';
import { FormPerfil } from '../../src/forms/sistema';

const { mutateMock, updateUserMock } = vi.hoisted(() => ({
  mutateMock: vi.fn(),
  updateUserMock: vi.fn(),
}));

const profileFake = { nome: 'Ana Souza', email: 'ana@x.com', matricula: '123', papel: 'Professor' };

vi.mock('../../src/auth/AuthContext', () => ({
  useAuth: () => ({
    user: { nome: 'Ana', email: 'ana@x.com', matricula: '123', papel: 'Professor' },
    updateUser: updateUserMock,
  }),
}));
vi.mock('../../src/auth/useAtualizarPerfil', () => ({
  useAtualizarPerfil: () => ({
    mutate: (payload, opts) => {
      mutateMock(payload, opts);
      opts?.onSuccess?.(profileFake);
    },
    isPending: false,
    isError: false,
  }),
}));

beforeEach(() => {
  mutateMock.mockClear();
  updateUserMock.mockClear();
});

test('editar nome e salvar chama mutate, updateUser e onClose', () => {
  const onClose = vi.fn();
  render(<FormPerfil onClose={onClose} />);
  fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Ana Souza' } });
  fireEvent.click(screen.getByRole('button', { name: /salvar/i }));
  expect(mutateMock).toHaveBeenCalled();
  expect(mutateMock.mock.calls[0][0]).toMatchObject({ Nome: 'Ana Souza', Email: 'ana@x.com' });
  expect(updateUserMock).toHaveBeenCalledWith(profileFake);
  expect(onClose).toHaveBeenCalled();
});

test('nome vazio bloqueia o submit', () => {
  const onClose = vi.fn();
  render(<FormPerfil onClose={onClose} />);
  fireEvent.change(screen.getByLabelText('Nome'), { target: { value: '  ' } });
  fireEvent.click(screen.getByRole('button', { name: /salvar/i }));
  expect(mutateMock).not.toHaveBeenCalled();
  expect(onClose).not.toHaveBeenCalled();
});

test('e-mail sem @ bloqueia o submit', () => {
  const onClose = vi.fn();
  render(<FormPerfil onClose={onClose} />);
  fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'sem-arroba' } });
  fireEvent.click(screen.getByRole('button', { name: /salvar/i }));
  expect(mutateMock).not.toHaveBeenCalled();
  expect(onClose).not.toHaveBeenCalled();
});

test('Matrícula e Papel são read-only; Nome e E-mail não são', () => {
  render(<FormPerfil onClose={() => {}} />);
  expect(screen.getByLabelText('Matrícula / SIAPE')).toHaveAttribute('readonly');
  expect(screen.getByLabelText('Papel')).toHaveAttribute('readonly');
  expect(screen.getByLabelText('Nome')).not.toHaveAttribute('readonly');
  expect(screen.getByLabelText('E-mail')).not.toHaveAttribute('readonly');
});
