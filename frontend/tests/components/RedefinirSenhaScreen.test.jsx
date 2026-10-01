import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RedefinirSenhaScreen, AVISO_SENHA_REDEFINIDA } from '../../src/RedefinirSenha';

function renderCom(onConcluido = vi.fn()) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <RedefinirSenhaScreen token="tok-abc" onConcluido={onConcluido} />
    </QueryClientProvider>
  );
  return onConcluido;
}

async function preencher(senha, confirmacao = senha) {
  await userEvent.type(screen.getByLabelText('Nova senha'), senha);
  await userEvent.type(screen.getByLabelText('Confirmar nova senha'), confirmacao);
  await userEvent.click(screen.getByRole('button', { name: /Salvar nova senha/ }));
}

describe('RedefinirSenhaScreen', () => {
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

  it('senhas diferentes não chegam ao servidor', async () => {
    renderCom();

    await preencher('Nova@Senha1', 'Outra@Senha1');

    expect(screen.getByText(/A confirmação não confere/)).toBeTruthy();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('salva e volta ao login com o aviso de senha redefinida', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 204 });
    const onConcluido = renderCom();

    await preencher('Nova@Senha1');

    await vi.waitFor(() => expect(onConcluido).toHaveBeenCalledWith(AVISO_SENHA_REDEFINIDA));
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({ Token: 'tok-abc', NovaSenha: 'Nova@Senha1' });
  });

  it('link inválido vira mensagem inline e não volta sozinho ao login', async () => {
    mockFetch.mockResolvedValue({
      ok: false, status: 400,
      text: async () => JSON.stringify({ message: 'Link inválido ou expirado. Peça outro em "Esqueci minha senha".' }),
    });
    const onConcluido = renderCom();

    await preencher('Nova@Senha1');

    expect(await screen.findByText(/Link inválido ou expirado/)).toBeTruthy();
    expect(onConcluido).not.toHaveBeenCalled();
  });
});
