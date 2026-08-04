import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FormEditarRegrasCompat } from '../../src/forms/reagentes';

vi.mock('../../src/auth/AuthContext', () => ({
  useAuth: () => ({ user: { nome: 'Ana Lima' }, token: 't' }),
}));
vi.mock('../../src/components/ToastContext', () => ({ useToast: () => ({ addToast: vi.fn() }) }));

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('FormEditarRegrasCompat', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      data: {},
      setItem(k, v) { this.data[k] = String(v); },
      getItem(k) { return this.data[k] ?? null; },
      removeItem(k) { delete this.data[k]; },
      clear() { this.data = {}; },
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, status: 200, json: async () => [],
    }));
  });

  afterEach(() => vi.unstubAllGlobals());

  it('desabilita "Adicionar" quando as duas classes são a mesma', async () => {
    const user = userEvent.setup();
    render(<FormEditarRegrasCompat onClose={vi.fn()} dispatch={vi.fn()} />, { wrapper });

    await user.click(screen.getByRole('button', { name: 'Nova' }));
    const adicionar = screen.getByRole('button', { name: 'Adicionar' });
    expect(adicionar).toBeEnabled();

    await user.selectOptions(screen.getByLabelText('Classe B'), '1');

    expect(adicionar).toBeDisabled();
    expect(screen.getByText(/duas classes diferentes/i)).toBeInTheDocument();
  });

  it('mantém "Adicionar" habilitado com classes diferentes', async () => {
    const user = userEvent.setup();
    render(<FormEditarRegrasCompat onClose={vi.fn()} dispatch={vi.fn()} />, { wrapper });

    await user.click(screen.getByRole('button', { name: 'Nova' }));
    await user.selectOptions(screen.getByLabelText('Classe A'), '7');

    expect(screen.getByRole('button', { name: 'Adicionar' })).toBeEnabled();
  });
});
