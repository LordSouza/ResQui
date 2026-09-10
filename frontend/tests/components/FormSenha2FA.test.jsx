import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FormSenha2FA } from '../../src/forms/sistema';
import { AuthContext } from '../../src/auth/AuthContext';

// Harness com `updateUser` real: o modal deriva o estado do 2FA do AuthContext, então só um
// contexto com estado revela se as mutations sincronizam o usuário em memória.
function Harness({ inicial }) {
  const [user, setUser] = useState(inicial);
  const [aberto, setAberto] = useState(true);
  return (
    <AuthContext.Provider value={{ user, token: 't', login: vi.fn(), logout: vi.fn(), updateUser: setUser }}>
      <button type="button" onClick={() => setAberto(true)}>reabrir modal</button>
      {aberto && <FormSenha2FA onClose={() => setAberto(false)} dispatch={vi.fn()} />}
    </AuthContext.Provider>
  );
}

function renderCom(user) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <Harness inicial={user} />
    </QueryClientProvider>
  );
}

const abrirAbaMfa = () => fireEvent.click(screen.getByRole('button', { name: /dois fatores/i }));

async function ativar2fa(codigos) {
  fetch.mockResolvedValue({
    ok: true, status: 200,
    json: async () => ({ codigos, secret: 'ABC123', otpauthUri: 'otpauth://totp/ResQui:ana' }),
  });
  abrirAbaMfa();
  fireEvent.change(screen.getByLabelText('Senha atual para ativar o 2FA'), { target: { value: 'Senha@123' } });
  fireEvent.click(screen.getByRole('button', { name: /ativar 2fa/i }));
  // o setup (secret/otpauthUri) resolve antes de o campo de código aparecer
  const input = await screen.findByLabelText('Código de verificação');
  fireEvent.change(input, { target: { value: '123456' } });
  fireEvent.click(screen.getByRole('button', { name: /confirmar/i }));
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
    renderCom({ nome: 'Ana', email: 'ana@lab.com', papel: 'Professor',
      twoFactorEnabled: true, codigosRecuperacaoRestantes: 7 });

    abrirAbaMfa();

    expect(screen.getByText(/7 de 10 códigos de recuperação restantes/i)).toBeInTheDocument();
  });

  it('exibe os códigos devolvidos ao ativar o 2FA', async () => {
    renderCom({ nome: 'Ana', email: 'ana@lab.com', papel: 'Professor',
      twoFactorEnabled: false, codigosRecuperacaoRestantes: 0 });

    await ativar2fa(['aaaa-1111', 'bbbb-2222']);

    await waitFor(() => expect(screen.getByText('aaaa-1111')).toBeInTheDocument());
    expect(screen.getByText(/só serão exibidos uma vez/i)).toBeInTheDocument();
  });

  // Exibição única: o backend só devolve os códigos na resposta de ativar/regenerar (o Identity
  // guarda hashes) — reabrir o modal não pode ressuscitá-los. E o estado do 2FA precisa refletir
  // a ativação sem reload, senão o usuário reativa e destrói os códigos que acabou de salvar.
  it('o painel de códigos some ao fechar o modal — não há releitura', async () => {
    const dez = Array.from({ length: 10 }, (_, i) => `cod-${i + 1}`);
    renderCom({ nome: 'Ana', email: 'ana@lab.com', papel: 'Professor',
      twoFactorEnabled: false, codigosRecuperacaoRestantes: 0 });

    await ativar2fa(dez);
    await waitFor(() => expect(screen.getByText('cod-1')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /^fechar$/i }));
    fireEvent.click(screen.getByRole('button', { name: /reabrir modal/i }));
    abrirAbaMfa();

    expect(screen.queryByText('cod-1')).not.toBeInTheDocument();
    expect(screen.queryByText(/só serão exibidos uma vez/i)).not.toBeInTheDocument();
    // ...e o modal reaberto sabe que o 2FA está ativo (sem reload), então oferece regenerar
    // em vez do botão "Ativar 2FA" que substituiria os códigos recém-salvos.
    expect(screen.getByText(/10 de 10 códigos de recuperação restantes/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /gerar novos códigos/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /ativar 2fa/i })).not.toBeInTheDocument();
  });

  // A outra ponta da mesma sincronização: sem ela, reabrir depois de desativar mostraria
  // "2FA ativo" e um botão "Gerar novos códigos" que devolve 400.
  it('desativar reflete no estado da aba sem reload', async () => {
    fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    vi.stubGlobal('prompt', vi.fn(() => 'cod-1'));

    renderCom({ nome: 'Ana', email: 'ana@lab.com', papel: 'Professor',
      twoFactorEnabled: true, codigosRecuperacaoRestantes: 5 });

    abrirAbaMfa();
    expect(screen.getByText(/2FA ativo/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^desativar$/i }));

    await waitFor(() => expect(screen.getByText(/2FA desativado/i)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /ativar 2fa/i })).toBeInTheDocument();
    expect(screen.queryByText(/códigos de recuperação restantes/i)).not.toBeInTheDocument();
  });
});

describe('FormSenha2FA — senha exigida no setup do 2FA', () => {
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

  it('não deixa iniciar o setup sem senha', () => {
    renderCom({ nome: 'Ana', email: 'ana@lab.com', papel: 'Professor', twoFactorEnabled: false });
    abrirAbaMfa();

    expect(screen.getByRole('button', { name: /ativar 2fa/i })).toBeDisabled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('envia a senha digitada para o endpoint de setup', async () => {
    fetch.mockResolvedValue({
      ok: true, status: 200,
      json: async () => ({ secret: 'ABC123', otpauthUri: 'otpauth://totp/ResQui:ana' }),
    });
    renderCom({ nome: 'Ana', email: 'ana@lab.com', papel: 'Professor', twoFactorEnabled: false });
    abrirAbaMfa();

    fireEvent.change(screen.getByLabelText('Senha atual para ativar o 2FA'), { target: { value: 'Senha@123' } });
    fireEvent.click(screen.getByRole('button', { name: /ativar 2fa/i }));

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    const [url, opts] = fetch.mock.calls[0];
    expect(url).toContain('/api/auth/2fa/setup');
    expect(JSON.parse(opts.body)).toEqual({ Senha: 'Senha@123' });
  });

  it('mostra o QR code do setup e mantém a chave para digitação manual', async () => {
    fetch.mockResolvedValue({
      ok: true, status: 200,
      json: async () => ({ secret: 'ABC123', otpauthUri: 'otpauth://totp/ResQui:ana', qrPngBase64: 'aGVsbG8=' }),
    });
    renderCom({ nome: 'Ana', email: 'ana@lab.com', papel: 'Professor', twoFactorEnabled: false });
    abrirAbaMfa();

    fireEvent.change(screen.getByLabelText('Senha atual para ativar o 2FA'), { target: { value: 'Senha@123' } });
    fireEvent.click(screen.getByRole('button', { name: /ativar 2fa/i }));

    const qr = await screen.findByAltText('QR code de configuração do autenticador');
    expect(qr).toHaveAttribute('src', 'data:image/png;base64,aGVsbG8=');
    expect(screen.getByText('ABC123')).toBeInTheDocument();
  });
});
