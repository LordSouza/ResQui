import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FormConvidarUsuario } from '../../src/forms/usuarios';
import { AuthContext } from '../../src/auth/AuthContext';

function renderCom(papel, { convites = [] } = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const user = { id: 'u-1', email: 'quem@lab.com', papel };
  const utils = render(
    <QueryClientProvider client={qc}>
      <AuthContext.Provider value={{ user, token: 't', login: vi.fn(), logout: vi.fn(), updateUser: vi.fn() }}>
        <FormConvidarUsuario onClose={vi.fn()} />
      </AuthContext.Provider>
    </QueryClientProvider>
  );
  return { ...utils, convites };
}

describe('FormConvidarUsuario', () => {
  let mockFetch, escrito;
  beforeEach(() => {
    escrito = null;
    vi.stubGlobal('localStorage', {
      data: {}, setItem(k, v) { this.data[k] = String(v); },
      getItem(k) { return this.data[k] ?? null; },
      removeItem(k) { delete this.data[k]; },
      clear() { this.data = {}; },
    });
    vi.stubGlobal('navigator', { clipboard: { writeText: async (t) => { escrito = t; } } });
    mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => [] });
    vi.stubGlobal('fetch', mockFetch);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('Professor só enxerga o papel Aluno no seletor', async () => {
    renderCom('Professor');

    const select = await screen.findByLabelText(/Papel do convidado/i);
    const opcoes = Array.from(select.options).map(o => o.value);
    expect(opcoes).toEqual(['Aluno']);
    expect(select.disabled).toBe(true);
  });

  it('Admin escolhe entre Professor e Aluno, e nunca Admin', async () => {
    renderCom('Admin');

    const select = await screen.findByLabelText(/Papel do convidado/i);
    const opcoes = Array.from(select.options).map(o => o.value);
    expect(opcoes).toContain('Professor');
    expect(opcoes).toContain('Aluno');
    expect(opcoes).not.toContain('Admin');
  });

  it('gera o link, exibe-o e copia para a área de transferência', async () => {
    mockFetch.mockImplementation(async (url, opts) => {
      if (opts?.method === 'POST') return { ok: true, status: 200, json: async () => ({ token: 'tok-abc', papel: 'Aluno' }) };
      return { ok: true, status: 200, json: async () => [] };
    });
    renderCom('Professor');

    await userEvent.click(await screen.findByRole('button', { name: /Gerar link/i }));

    const link = await screen.findByText(new RegExp(`\\?convite=tok-abc$`));
    expect(link).toBeTruthy();

    await userEvent.click(screen.getByRole('button', { name: /Copiar link/i }));
    await waitFor(() => expect(escrito).toMatch(/\?convite=tok-abc$/));
  });

  it('o card nomeia o papel do link e trocar o papel descarta o link antigo', async () => {
    mockFetch.mockImplementation(async (url, opts) => {
      if (opts?.method === 'POST') return { ok: true, status: 200, json: async () => ({ token: 'tok-prof', papel: 'Professor' }) };
      return { ok: true, status: 200, json: async () => [] };
    });
    renderCom('Admin');

    const select = await screen.findByLabelText(/Papel do convidado/i);
    await userEvent.selectOptions(select, 'Professor');
    await userEvent.click(screen.getByRole('button', { name: /Gerar link/i }));

    expect(await screen.findByText(/cria uma conta de/i)).toHaveTextContent('Professor');

    await userEvent.selectOptions(select, 'Aluno');

    expect(screen.queryByText(new RegExp('\\?convite=tok-prof'))).toBeNull();
    expect(screen.queryByRole('button', { name: /Copiar link/i })).toBeNull();
  });

  it('lista convites com situação e oferece revogar só nos pendentes', async () => {
    mockFetch.mockImplementation(async (url) => {
      if (url === '/api/convites') {
        return { ok: true, status: 200, json: async () => ([
          { id: 1, papel: 'Aluno', status: 'pendente', criadoEm: '2026-09-22T10:00:00Z', expiraEm: '2026-09-29T10:00:00Z', usadoEm: null, usadoPor: null },
          { id: 2, papel: 'Aluno', status: 'usado', criadoEm: '2026-09-20T10:00:00Z', expiraEm: '2026-09-27T10:00:00Z', usadoEm: '2026-09-21T10:00:00Z', usadoPor: 'Novo Aluno' },
        ]) };
      }
      return { ok: true, status: 200, json: async () => ({}) };
    });
    renderCom('Professor');

    expect(await screen.findByText('Pendente')).toBeTruthy();
    expect(screen.getByText('Usado')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /Revogar/i })).toHaveLength(1);
  });

  it('Professor não vê Revogar em convite de Professor, que a API recusaria', async () => {
    mockFetch.mockImplementation(async (url) => {
      if (url === '/api/convites') {
        return { ok: true, status: 200, json: async () => ([
          { id: 1, papel: 'Professor', status: 'pendente', criadoEm: '2026-09-22T10:00:00Z', expiraEm: '2026-09-29T10:00:00Z', usadoEm: null, usadoPor: null },
          { id: 2, papel: 'Aluno', status: 'pendente', criadoEm: '2026-09-22T10:00:00Z', expiraEm: '2026-09-29T10:00:00Z', usadoEm: null, usadoPor: null },
        ]) };
      }
      return { ok: true, status: 200, json: async () => ({}) };
    });
    renderCom('Professor');

    await screen.findByText('Professor');
    expect(screen.getAllByRole('button', { name: /Revogar/i })).toHaveLength(1);
  });

  it('revogar o convite recém-gerado retira o link da tela', async () => {
    mockFetch.mockImplementation(async (url, opts) => {
      if (opts?.method === 'POST') return { ok: true, status: 200, json: async () => ({ id: 5, token: 'tok-abc', papel: 'Aluno' }) };
      if (opts?.method === 'DELETE') return { ok: true, status: 204, json: async () => null };
      return { ok: true, status: 200, json: async () => ([
        { id: 5, papel: 'Aluno', status: 'pendente', criadoEm: '2026-09-22T10:00:00Z', expiraEm: '2026-09-29T10:00:00Z', usadoEm: null, usadoPor: null },
      ]) };
    });
    renderCom('Professor');

    await userEvent.click(await screen.findByRole('button', { name: /Gerar link/i }));
    expect(await screen.findByRole('button', { name: /Copiar link/i })).toBeTruthy();

    await userEvent.click(screen.getByRole('button', { name: /Revogar/i }));

    await waitFor(() => expect(screen.queryByRole('button', { name: /Copiar link/i })).toBeNull());
  });

  it('mostra a mensagem do servidor quando a geração falha', async () => {
    mockFetch.mockImplementation(async (url, opts) => {
      if (opts?.method === 'POST') return { ok: false, status: 400, text: async () => JSON.stringify({ message: 'Convidar Professor é só o Admin; você pode convidar Aluno.' }) };
      return { ok: true, status: 200, json: async () => [] };
    });
    renderCom('Professor');

    await userEvent.click(await screen.findByRole('button', { name: /Gerar link/i }));

    expect(await screen.findByText(/só o Admin/i)).toBeTruthy();
  });
});
