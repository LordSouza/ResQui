import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConviteScreen } from '../../src/Convite';
import { AuthContext } from '../../src/auth/AuthContext';

function renderCom({ onConcluido = vi.fn(), login = vi.fn() } = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <AuthContext.Provider value={{ user: null, token: null, login, logout: vi.fn(), updateUser: vi.fn() }}>
        <ConviteScreen token="tok-abc" onConcluido={onConcluido} />
      </AuthContext.Provider>
    </QueryClientProvider>
  );
  return { onConcluido, login };
}

async function preencher({ senha = 'Senha@123', confirmacao = 'Senha@123' } = {}) {
  await userEvent.type(screen.getByLabelText(/Nome completo/i), 'Novo Aluno');
  await userEvent.type(screen.getByLabelText(/E-mail institucional/i), 'novo@lab.com');
  await userEvent.type(screen.getByLabelText('Senha'), senha);
  await userEvent.type(screen.getByLabelText(/Confirmar senha/i), confirmacao);
}

describe('ConviteScreen', () => {
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

  const conviteValido = { ok: true, status: 200, json: async () => ({ papel: 'Aluno' }) };

  it('anuncia o papel do convite antes do formulário', async () => {
    mockFetch.mockResolvedValue(conviteValido);
    renderCom();

    expect(await screen.findByText(/Convite para Aluno/i)).toBeTruthy();
    expect(mockFetch.mock.calls[0][0]).toBe('/api/convites/tok-abc');
  });

  it('link morto vira mensagem, não formulário', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404, text: async () => '' });
    renderCom();

    expect(await screen.findByText(/Convite indisponível/i)).toBeTruthy();
    expect(screen.queryByLabelText(/Nome completo/i)).toBeNull();
  });

  it('aceita o convite e entra com as credenciais recém-criadas', async () => {
    mockFetch.mockImplementation(async (url) => {
      if (url === '/api/convites/tok-abc') return conviteValido;
      if (url === '/api/convites/tok-abc/aceitar') return { ok: true, status: 204, json: async () => null };
      if (url === '/api/auth/login') return { ok: true, status: 200, json: async () => ({ token: 'jwt', user: { id: 'u-9' } }) };
      throw new Error(`fetch inesperado: ${url}`);
    });
    const { onConcluido, login } = renderCom();

    await screen.findByLabelText(/Nome completo/i);
    await preencher();
    await userEvent.click(screen.getByRole('button', { name: /Criar conta e entrar/i }));

    await waitFor(() => expect(login).toHaveBeenCalledWith('jwt', { id: 'u-9' }));
    const corpoLogin = JSON.parse(mockFetch.mock.calls.find(c => c[0] === '/api/auth/login')[1].body);
    expect(corpoLogin).toMatchObject({ Email: 'novo@lab.com', Senha: 'Senha@123' });
    expect(onConcluido).toHaveBeenCalled();
  });

  it('conta criada mas login falhando manda o convidado para o login, sem reenviar o aceite', async () => {
    mockFetch.mockImplementation(async (url) => {
      if (url === '/api/convites/tok-abc') return conviteValido;
      if (url === '/api/convites/tok-abc/aceitar') return { ok: true, status: 204, json: async () => null };
      if (url === '/api/auth/login') throw new TypeError('Failed to fetch');
      throw new Error(`fetch inesperado: ${url}`);
    });
    renderCom();

    await screen.findByLabelText(/Nome completo/i);
    await preencher();
    await userEvent.click(screen.getByRole('button', { name: /Criar conta e entrar/i }));

    expect(await screen.findByText(/Conta criada/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Criar conta e entrar/i })).toBeNull();
    expect(mockFetch.mock.calls.filter(c => String(c[0]).endsWith('/aceitar'))).toHaveLength(1);
  });

  it('confirmação divergente não chega a chamar a API', async () => {
    mockFetch.mockResolvedValue(conviteValido);
    renderCom();

    await screen.findByLabelText(/Nome completo/i);
    await preencher({ confirmacao: 'Outra@123' });
    await userEvent.click(screen.getByRole('button', { name: /Criar conta e entrar/i }));

    expect(await screen.findByText(/confirmação não confere/i)).toBeTruthy();
    expect(mockFetch.mock.calls.some(c => String(c[0]).endsWith('/aceitar'))).toBe(false);
  });

  it('renderiza inline a recusa de senha fraca vinda do servidor', async () => {
    mockFetch.mockImplementation(async (url) => {
      if (url === '/api/convites/tok-abc') return conviteValido;
      return { ok: false, status: 400, text: async () => JSON.stringify({ message: 'Passwords must have at least one digit.' }) };
    });
    renderCom();

    await screen.findByLabelText(/Nome completo/i);
    await preencher();
    await userEvent.click(screen.getByRole('button', { name: /Criar conta e entrar/i }));

    expect(await screen.findByText(/at least one digit/i)).toBeTruthy();
  });
});
