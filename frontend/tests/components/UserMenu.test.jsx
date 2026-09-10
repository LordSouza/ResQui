import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserMenu } from '../../src/App';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('UserMenu — identidade real', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      data: {},
      setItem(k, v) { this.data[k] = String(v); },
      getItem(k) { return this.data[k] ?? null; },
      removeItem(k) { delete this.data[k]; },
      clear() { this.data = {}; },
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, status: 200, json: async () => [{ jti: 'a' }, { jti: 'b' }],
    }));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('mostra nome, papel e badge 2FA do usuário real', async () => {
    const user = { nome: 'Ana Lima', email: 'ana@x.com', papel: 'Professor', twoFactorEnabled: true };
    render(<UserMenu user={user} onLogout={vi.fn()} dispatch={vi.fn()}/>, { wrapper });

    await userEvent.click(screen.getByLabelText('Conta e preferências'));

    expect(screen.getAllByText('Ana Lima').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Professor').length).toBeGreaterThan(0);
    expect(screen.getByText('2FA ativo')).toBeInTheDocument();
    expect(await screen.findByText('2 dispositivos')).toBeInTheDocument();
    expect(screen.queryByText('IMC')).toBeNull();
  });

  it('omite o badge 2FA quando twoFactorEnabled é falso', async () => {
    const user = { nome: 'Beto Souza', email: 'beto@x.com', papel: 'Professor', twoFactorEnabled: false };
    render(<UserMenu user={user} onLogout={vi.fn()} dispatch={vi.fn()}/>, { wrapper });

    await userEvent.click(screen.getByLabelText('Conta e preferências'));

    expect(screen.queryByText('2FA ativo')).toBeNull();
  });

  it('não oferece ajuda que o app não tem — sem reportar problema, documentação ou atalhos', async () => {
    const user = { nome: 'Ana Lima', email: 'ana@x.com', papel: 'Professor' };
    render(<UserMenu user={user} onLogout={vi.fn()} dispatch={vi.fn()}/>, { wrapper });

    await userEvent.click(screen.getByLabelText('Conta e preferências'));

    expect(screen.queryByText('Ajuda')).toBeNull();
    expect(screen.queryByText('Reportar problema')).toBeNull();
    expect(screen.queryByText('Documentação')).toBeNull();
    expect(screen.queryByText('Atalhos de teclado')).toBeNull();
  });
});
