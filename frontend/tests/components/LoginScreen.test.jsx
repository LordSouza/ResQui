import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LoginScreen } from '../../src/Login';
import { AuthContext } from '../../src/auth/AuthContext';

function renderCom(props = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <AuthContext.Provider value={{ user: null, token: null, login: vi.fn(), logout: vi.fn(), updateUser: vi.fn() }}>
        <LoginScreen {...props} />
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

async function abrirEsqueciSenha(email = 'ana@lab.com') {
  await userEvent.click(screen.getByRole('button', { name: 'Esqueci minha senha' }));
  const campo = screen.getByLabelText('E-mail da conta');
  await userEvent.clear(campo);
  await userEvent.type(campo, email);
}

describe('LoginScreen — esqueci minha senha', () => {
  let mockFetch;
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      data: {}, setItem(k, v) { this.data[k] = String(v); },
      getItem(k) { return this.data[k] ?? null; },
      removeItem(k) { delete this.data[k]; },
      clear() { this.data = {}; },
    });
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('pede o link e responde com a mensagem neutra, que não diz se a conta existe', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 204 });
    renderCom();

    await abrirEsqueciSenha();
    await userEvent.click(screen.getByRole('button', { name: /Enviar link/ }));

    expect(await screen.findByText(/Se houver uma conta com esse e-mail, enviamos um link válido por 1 hora/)).toBeTruthy();
    expect(mockFetch.mock.calls[0][0]).toBe('/api/auth/esqueci-senha');
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({ Email: 'ana@lab.com' });
  });

  it('mostra inline a recusa do servidor quando o e-mail não está configurado', async () => {
    mockFetch.mockResolvedValue({
      ok: false, status: 503,
      text: async () => JSON.stringify({ message: 'A recuperação de senha por e-mail não está configurada nesta instalação. Procure o administrador.' }),
    });
    renderCom();

    await abrirEsqueciSenha();
    await userEvent.click(screen.getByRole('button', { name: /Enviar link/ }));

    expect(await screen.findByText(/Procure o administrador/)).toBeTruthy();
    expect(screen.queryByText(/Se houver uma conta/)).toBeNull();
  });

  it('volta para o formulário de entrada', async () => {
    renderCom();

    await abrirEsqueciSenha();
    await userEvent.click(screen.getByRole('button', { name: 'Voltar para o login' }));

    expect(screen.getByRole('heading', { name: 'Entrar no ResQui' })).toBeTruthy();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('exibe o aviso recebido, como o de senha redefinida', () => {
    renderCom({ aviso: 'Senha redefinida. Entre com a nova senha.' });

    expect(screen.getByRole('status').textContent).toMatch(/Senha redefinida/);
  });
});
