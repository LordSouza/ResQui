import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BuscaGlobal } from '../../src/components/BuscaGlobal';
import { AuthContext } from '../../src/auth/AuthContext';

const REAGENTES = {
  total: 7,
  items: Array.from({ length: 5 }, (_, i) => ({
    id: `R-0000${i + 1}`, nome: `Ácido teste ${i + 1}`, cas: '7647-01-0',
    classeReatividade: 1, estoque: 1, unidade: 'L', validadeStatus: 'ok', local: 'Lab A', controlado: false,
  })),
};

const RESIDUOS = [
  { id: 12, descricao: 'Mistura ácida de limpeza', tipo: 'liquido', status: 'aguardando-coleta', laboratorioId: 'Lab-001', volume: 2, unidade: 'L', classesReatividade: [1] },
  { id: 13, descricao: 'Solvente halogenado', tipo: 'liquido', status: 'solicitado', laboratorioId: 'Lab-001', volume: 1, unidade: 'L', classesReatividade: [6] },
];

const MTRS = [
  { id: 3, numero: 'MTR-2026-0003', gerador: 'Instituição Ácida', transportadora: 'Transp X', residuoIds: [] },
];

const USUARIOS = [
  { id: 'u-1', email: 'ana@lab.com', nome: 'Ana Ácido', matricula: 'M-1', papel: 'Gestor', roles: ['Gestor'], arquivado: false, twoFactorEnabled: false },
];

function stubLocalStorage() {
  vi.stubGlobal('localStorage', {
    data: {},
    setItem(k, v) { this.data[k] = String(v); },
    getItem(k) { return this.data[k] ?? null; },
    removeItem(k) { delete this.data[k]; },
    clear() { this.data = {}; },
  });
}

function stubFetch({ mtrsOk = true } = {}) {
  const fn = vi.fn(async (url) => {
    const u = String(url);
    if (u.includes('/api/reagentes')) return { ok: true, status: 200, json: async () => REAGENTES };
    if (u.includes('/api/residuos')) return { ok: true, status: 200, json: async () => RESIDUOS };
    if (u.includes('/api/mtrs')) {
      return mtrsOk
        ? { ok: true, status: 200, json: async () => MTRS }
        : { ok: false, status: 500, text: async () => '{"message":"falhou"}' };
    }
    if (u.includes('/api/usuarios')) return { ok: true, status: 200, json: async () => USUARIOS };
    return { ok: true, status: 200, json: async () => [] };
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

function renderCom(user = { id: 'admin-1', papel: 'Admin' }) {
  const dispatch = vi.fn();
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <AuthContext.Provider value={{ user, token: 't', login: vi.fn(), logout: vi.fn(), updateUser: vi.fn() }}>
        <BuscaGlobal dispatch={dispatch} />
      </AuthContext.Provider>
    </QueryClientProvider>
  );
  return { dispatch, campo: screen.getByRole('textbox') };
}

// Timers reais: o debounce é de 300 ms e as queries do React Query resolvem em microtasks.
// vi.useFakeTimers() com React Query trava o retry/gc interno e produz falso negativo.
const esperarDebounce = () => new Promise(r => setTimeout(r, 400));

describe('BuscaGlobal', () => {
  beforeEach(() => {
    stubLocalStorage();
    stubFetch();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('não busca nada com menos de dois caracteres', async () => {
    const fetchMock = globalThis.fetch;
    const { campo } = renderCom();

    fireEvent.change(campo, { target: { value: 'á' } });
    await esperarDebounce();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('lista resultados de cada seção', async () => {
    const { campo } = renderCom();

    fireEvent.change(campo, { target: { value: 'ácid' } });

    expect(await screen.findByText('Ácido teste 1', {}, { timeout: 3000 })).toBeInTheDocument();
    expect(await screen.findByText(/Mistura ácida de limpeza/, {}, { timeout: 3000 })).toBeInTheDocument();
    expect(await screen.findByText(/MTR-2026-0003/, {}, { timeout: 3000 })).toBeInTheDocument();
    expect(await screen.findByText(/Ana Ácido/, {}, { timeout: 3000 })).toBeInTheDocument();
  });

  it('mostra no máximo 5 itens por seção e o total real', async () => {
    const { campo } = renderCom();

    fireEvent.change(campo, { target: { value: 'ácid' } });

    await screen.findByText('Ácido teste 1', {}, { timeout: 3000 });
    expect(screen.getAllByTestId('resultado-reagente')).toHaveLength(5);
    // total do servidor é 7, não os 5 exibidos
    expect(screen.getByTestId('total-reagentes')).toHaveTextContent('7');
  });

  it('não busca usuários quando o papel não é Admin', async () => {
    const fetchMock = globalThis.fetch;
    const { campo } = renderCom({ id: 'g-1', papel: 'Gestor' });

    fireEvent.change(campo, { target: { value: 'ácid' } });

    await screen.findByText('Ácido teste 1', {}, { timeout: 3000 });
    expect(fetchMock.mock.calls.some(([u]) => String(u).includes('/api/usuarios'))).toBe(false);
    expect(screen.queryByText(/Ana Ácido/)).not.toBeInTheDocument();
  });

  it('clicar num reagente abre o detalhe dele', async () => {
    const { campo, dispatch } = renderCom();

    fireEvent.change(campo, { target: { value: 'ácid' } });
    fireEvent.click(await screen.findByText('Ácido teste 1', {}, { timeout: 3000 }));

    expect(dispatch).toHaveBeenCalledWith({ type: 'detail', id: 'R-00001' });
  });

  it('clicar num resíduo navega com destaque na linha', async () => {
    const { campo, dispatch } = renderCom();

    fireEvent.change(campo, { target: { value: 'ácid' } });
    fireEvent.click(await screen.findByText(/Mistura ácida de limpeza/, {}, { timeout: 3000 }));

    expect(dispatch).toHaveBeenCalledWith({ type: 'nav', screen: 'residuos', flashId: 12 });
  });

  it('avisa quando o termo não casa com nada', async () => {
    const { campo } = renderCom();

    fireEvent.change(campo, { target: { value: 'zzzz' } });

    expect(await screen.findByText(/nenhum resultado para/i, {}, { timeout: 3000 })).toBeInTheDocument();
  });

  it('uma seção que falha não derruba as outras', async () => {
    vi.unstubAllGlobals();
    stubLocalStorage();
    stubFetch({ mtrsOk: false });
    const { campo } = renderCom();

    fireEvent.change(campo, { target: { value: 'ácid' } });

    expect(await screen.findByText(/não foi possível buscar mtrs/i, {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByText('Ácido teste 1')).toBeInTheDocument();
  });

  it('Esc fecha o painel', async () => {
    const { campo } = renderCom();

    fireEvent.change(campo, { target: { value: 'ácid' } });
    await screen.findByText('Ácido teste 1', {}, { timeout: 3000 });

    fireEvent.keyDown(campo, { key: 'Escape' });

    await waitFor(() => expect(screen.queryByText('Ácido teste 1')).not.toBeInTheDocument());
  });

  it('Esc fecha o painel também com o foco num resultado (após Tab para dentro da lista)', async () => {
    const { campo } = renderCom();

    fireEvent.change(campo, { target: { value: 'ácid' } });
    const resultado = await screen.findByText('Ácido teste 1', {}, { timeout: 3000 });
    resultado.closest('button').focus();

    fireEvent.keyDown(resultado.closest('button'), { key: 'Escape' });

    await waitFor(() => expect(screen.queryByText('Ácido teste 1')).not.toBeInTheDocument());
  });
});
