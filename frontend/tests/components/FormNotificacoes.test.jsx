import { render, screen, fireEvent } from '@testing-library/react';
import { FormNotificacoes } from '../../src/forms/sistema';

const { consultaPrefs, mutateMock } = vi.hoisted(() => ({
  consultaPrefs: { current: null },
  mutateMock: vi.fn(),
}));

vi.mock('../../src/notificacoes/useGetNotificacaoPrefs', () => ({
  useGetNotificacaoPrefs: () => consultaPrefs.current,
}));
vi.mock('../../src/notificacoes/useNotificacaoPrefs', () => ({
  useNotificacaoPrefs: () => ({ mutate: mutateMock, isPending: false }),
}));

const PREFS = { expiry: true, 'low-stock': false, compat: false, coleta: false };

beforeEach(() => {
  mutateMock.mockClear();
});

test('mostra as quatro preferências com o estado gravado', () => {
  consultaPrefs.current = { data: PREFS, isPending: false, isError: false, refetch: vi.fn() };
  render(<FormNotificacoes onClose={vi.fn()} />);
  expect(screen.getByText('Vencimento de reagentes')).toBeInTheDocument();
  expect(screen.getAllByRole('button', { name: 'Ativo' })).toHaveLength(1);
  expect(screen.getAllByRole('button', { name: 'Inativo' })).toHaveLength(3);
});

test('avisa quando as preferências não carregam e oferece tentar de novo', () => {
  const refetch = vi.fn();
  consultaPrefs.current = { data: undefined, isPending: false, isError: true, refetch };
  render(<FormNotificacoes onClose={vi.fn()} />);
  expect(screen.getByText(/Não foi possível carregar suas preferências/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
  expect(refetch).toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: 'Salvar' })).not.toBeInTheDocument();
});

test('salva as preferências alteradas', () => {
  consultaPrefs.current = { data: PREFS, isPending: false, isError: false, refetch: vi.fn() };
  render(<FormNotificacoes onClose={vi.fn()} />);
  fireEvent.click(screen.getAllByRole('button', { name: 'Inativo' })[0]);
  fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
  expect(mutateMock.mock.calls[0][0]).toEqual({ ...PREFS, 'low-stock': true });
});
