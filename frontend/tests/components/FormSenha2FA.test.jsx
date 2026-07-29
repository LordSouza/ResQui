import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FormSenha2FA } from '../../src/forms/sistema';
import { AuthContext } from '../../src/auth/AuthContext';

function renderCom(user) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AuthContext.Provider value={{ user, token: 't', login: vi.fn(), logout: vi.fn() }}>
        <FormSenha2FA onClose={vi.fn()} dispatch={vi.fn()} />
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

describe('FormSenha2FA — códigos de recuperação', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      data: {},
      setItem(k, v) { this.data[k] = String(v); },
      getItem(k) { return this.data[k] ?? null; },
      removeItem(k) { delete this.data[k]; },
      clear() { this.data = {}; },
    });
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => vi.unstubAllGlobals());

  it('mostra a contagem de códigos restantes quando o 2FA está ativo', () => {
    renderCom({ nome: 'Ana', email: 'ana@lab.com', papel: 'Gestor',
      twoFactorEnabled: true, codigosRecuperacaoRestantes: 7 });

    fireEvent.click(screen.getByRole('button', { name: /dois fatores/i }));

    expect(screen.getByText(/7 de 10 códigos de recuperação restantes/i)).toBeInTheDocument();
  });

  it('exibe os códigos devolvidos ao ativar o 2FA', async () => {
    fetch.mockResolvedValue({
      ok: true, status: 200,
      json: async () => ({ codigos: ['aaaa-1111', 'bbbb-2222'] }),
    });

    renderCom({ nome: 'Ana', email: 'ana@lab.com', papel: 'Gestor',
      twoFactorEnabled: false, codigosRecuperacaoRestantes: 0 });

    fireEvent.click(screen.getByRole('button', { name: /dois fatores/i }));
    fireEvent.click(screen.getByRole('button', { name: /ativar 2fa/i }));

    // o setup (secret/otpauthUri) resolve antes de o campo de código aparecer
    const input = await screen.findByLabelText('Código de verificação');
    fireEvent.change(input, { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }));

    await waitFor(() => expect(screen.getByText('aaaa-1111')).toBeInTheDocument());
    expect(screen.getByText(/só serão exibidos uma vez/i)).toBeInTheDocument();
  });
});
