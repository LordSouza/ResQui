import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChatMCP } from '../../src/chat/ChatMCP';
import { initialState } from '../../src/store/reducer';

const renderChat = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const dispatch = vi.fn();
  render(
    <QueryClientProvider client={client}>
      <ChatMCP state={{ ...initialState, chatOpen: true }} dispatch={dispatch}/>
    </QueryClientProvider>
  );
  return { dispatch };
};

const json = (body) => ({ ok: true, status: 200, json: async () => body });

const responderCom = (respostaDoAssistente) => vi.fn(async (url) => {
  if (String(url) === '/api/assistente/mensagem') return respostaDoAssistente;
  if (String(url).startsWith('/api/reagentes')) return json({ items: [], total: 0 });
  return json([]);
});

describe('ChatMCP', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      data: {},
      setItem(k, v) { this.data[k] = String(v); },
      getItem(k) { return this.data[k] ?? null; },
      removeItem(k) { delete this.data[k]; },
      clear() { this.data = {}; },
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('envia a mensagem ao backend e mostra a resposta do assistente', async () => {
    vi.stubGlobal('fetch', responderCom(json({ say: 'Nada vence nos próximos 90 dias.', action: 'explain', params: {} })));
    const user = userEvent.setup();

    renderChat();
    await user.type(screen.getByLabelText(/Mensagem para o assistente/i), 'o que está vencendo?');
    await user.keyboard('{Enter}');

    await waitFor(() => expect(screen.getByText('Nada vence nos próximos 90 dias.')).toBeInTheDocument());
    const chamada = fetch.mock.calls.find(c => String(c[0]) === '/api/assistente/mensagem');
    expect(JSON.parse(chamada[1].body).Mensagem).toBe('o que está vencendo?');
  });

  it('mostra a mensagem de erro do servidor no lugar de uma desculpa genérica', async () => {
    vi.stubGlobal('fetch', responderCom({
      ok: false, status: 400,
      text: async () => JSON.stringify({ message: 'O assistente não respondeu a tempo.' }),
    }));
    const user = userEvent.setup();

    renderChat();
    await user.type(screen.getByLabelText(/Mensagem para o assistente/i), 'oi');
    await user.keyboard('{Enter}');

    await waitFor(() => expect(screen.getByText('O assistente não respondeu a tempo.')).toBeInTheDocument());
  });

  it('declara-se indisponível e desabilita a entrada quando o backend responde 503', async () => {
    vi.stubGlobal('fetch', responderCom({
      ok: false, status: 503,
      text: async () => JSON.stringify({ message: 'O assistente não está configurado nesta instalação.' }),
    }));
    const user = userEvent.setup();

    renderChat();
    await user.type(screen.getByLabelText(/Mensagem para o assistente/i), 'oi');
    await user.keyboard('{Enter}');

    await waitFor(() => expect(screen.getByText(/não configurado/i)).toBeInTheDocument());
    expect(screen.getByLabelText(/Mensagem para o assistente/i)).toBeDisabled();
  });
});
