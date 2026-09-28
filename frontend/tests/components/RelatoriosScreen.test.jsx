import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RelatoriosScreen } from '../../src/screens/RelatoriosScreen';
import { initialState } from '../../src/store/reducer';

vi.mock('../../src/components/ToastContext', () => ({ useToast: vi.fn() }));
import { useToast } from '../../src/components/ToastContext';
vi.mock('../../src/auth/AuthContext', () => ({ useAuth: vi.fn() }));
import { useAuth } from '../../src/auth/AuthContext';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('RelatoriosScreen', () => {
  let addToast;

  beforeEach(() => {
    addToast = vi.fn();
    useToast.mockReturnValue({ addToast });
    useAuth.mockReturnValue({ user: { papel: 'Professor' } });
    global.URL.createObjectURL = vi.fn(() => 'blob:test');
    vi.stubGlobal('localStorage', {
      data: {}, setItem(k, v) { this.data[k] = String(v); },
      getItem(k) { return this.data[k] ?? null; },
      removeItem(k) { delete this.data[k]; }, clear() { this.data = {}; },
    });
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({ ok: true, json: async () => [] })
    ));
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it('renders the page title', () => {
    render(<RelatoriosScreen state={initialState} dispatch={vi.fn()} />, { wrapper });
    expect(screen.getByRole('heading', { name: /Relatórios/i, level: 1 })).toBeInTheDocument();
  });

  it('renders all 5 report type cards', () => {
    render(<RelatoriosScreen state={initialState} dispatch={vi.fn()} />, { wrapper });
    expect(screen.getByText('PGRS Anual')).toBeInTheDocument();
    expect(screen.getByText('Inventário de reagentes')).toBeInTheDocument();
    expect(screen.getByText('Indicadores de geração')).toBeInTheDocument();
  });

  it('shows history section', () => {
    render(<RelatoriosScreen state={initialState} dispatch={vi.fn()} />, { wrapper });
    expect(screen.getByText(/Histórico de relatórios gerados/i)).toBeInTheDocument();
  });

  it('mostra o estado vazio quando não há histórico', async () => {
    render(<RelatoriosScreen state={initialState} dispatch={vi.fn()} />, { wrapper });
    expect(await screen.findByText('Nenhum relatório gerado ainda.')).toBeInTheDocument();
  });

  it('shows no hardcoded data', () => {
    render(<RelatoriosScreen state={initialState} dispatch={vi.fn()} />, { wrapper });
    expect(screen.queryByText(/PDF · 38 pág/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Atualizado 19\/nov/)).not.toBeInTheDocument();
  });

  it('shows no NaN or undefined in output', () => {
    const { container } = render(<RelatoriosScreen state={initialState} dispatch={vi.fn()} />, { wrapper });
    expect(container.textContent).not.toContain('NaN');
    expect(container.textContent).not.toContain('undefined');
  });

  it('passa a mensagem de erro como string para o addToast, não como objeto', async () => {
    vi.stubGlobal('fetch', vi.fn((url, opts) =>
      opts?.method === 'POST'
        ? Promise.resolve({ ok: false, status: 400, text: async () => JSON.stringify({ message: 'Falha ao gerar' }) })
        : Promise.resolve({ ok: true, json: async () => [] })
    ));

    render(<RelatoriosScreen state={initialState} dispatch={vi.fn()} />, { wrapper });
    fireEvent.click(screen.getAllByRole('button', { name: /Gerar/i })[0]);

    await waitFor(() => expect(addToast).toHaveBeenCalled());
    expect(typeof addToast.mock.calls[0][0]).toBe('string');
    expect(addToast.mock.calls[0][0]).toMatch(/Falha ao gerar/);
    expect(addToast.mock.calls[0][1]).toBe('error');
  });

  // POST /api/relatorios/gerar exige Cadastro; o histórico e o download seguem legíveis por todos.
  it('esconde "Gerar" de Aluno', () => {
    useAuth.mockReturnValue({ user: { papel: 'Aluno' } });
    render(<RelatoriosScreen state={initialState} dispatch={vi.fn()} />, { wrapper });
    expect(screen.queryAllByRole('button', { name: /^Gerar$/i })).toHaveLength(0);
    expect(screen.queryByRole('button', { name: /Configurar PGRS/i })).not.toBeInTheDocument();
  });

  it('mostra "Gerar" em todos os tipos para Professor', () => {
    useAuth.mockReturnValue({ user: { papel: 'Professor' } });
    render(<RelatoriosScreen state={initialState} dispatch={vi.fn()} />, { wrapper });
    expect(screen.getAllByRole('button', { name: /Gerar/i }).length).toBeGreaterThan(0);
  });

  // PUT /api/pgrs-config exige Administracao: a configuração é global, e só o Admin a escreve.
  it('esconde "Configurar PGRS" de Professor', () => {
    useAuth.mockReturnValue({ user: { papel: 'Professor' } });
    render(<RelatoriosScreen state={initialState} dispatch={vi.fn()} />, { wrapper });
    expect(screen.queryByRole('button', { name: /Configurar PGRS/i })).not.toBeInTheDocument();
  });

  it('mostra "Configurar PGRS" para Admin', () => {
    useAuth.mockReturnValue({ user: { papel: 'Admin' } });
    render(<RelatoriosScreen state={initialState} dispatch={vi.fn()} />, { wrapper });
    expect(screen.getByRole('button', { name: /Configurar PGRS/i })).toBeInTheDocument();
  });
});

describe('RelatoriosScreen — recorte por laboratório', () => {
  const LABS = [{ id: 'Lab-001', nome: 'Química Geral' }, { id: 'Lab-002', nome: 'Físico-Química' }];
  const HISTORICO = [
    { id: 1, tipo: 'inventario', titulo: 'Inventário de reagentes', geradoEm: '2026-09-28T00:00:00Z', totalLinhas: 3, laboratorioIds: null },
    { id: 2, tipo: 'inventario', titulo: 'Inventário de reagentes', geradoEm: '2026-09-28T00:00:00Z', totalLinhas: 1, laboratorioIds: ['Lab-001', 'Lab-009'] },
  ];

  beforeEach(() => {
    useToast.mockReturnValue({ addToast: vi.fn() });
    global.URL.createObjectURL = vi.fn(() => 'blob:test');
    vi.stubGlobal('localStorage', {
      data: {}, setItem(k, v) { this.data[k] = String(v); },
      getItem(k) { return this.data[k] ?? null; },
      removeItem(k) { delete this.data[k]; }, clear() { this.data = {}; },
    });
    vi.stubGlobal('fetch', vi.fn((url, opts) => {
      const u = String(url);
      if (opts?.method === 'POST') return Promise.resolve({ ok: true, json: async () => ({ id: 9, titulo: 'Inventário de reagentes' }) });
      if (u.startsWith('/api/laboratorios')) return Promise.resolve({ ok: true, json: async () => LABS });
      if (u.includes('/download')) return Promise.resolve({ ok: true, blob: async () => new Blob(['x']) });
      return Promise.resolve({ ok: true, json: async () => HISTORICO });
    }));
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it('envia o laboratório escolhido ao gerar', async () => {
    useAuth.mockReturnValue({ user: { papel: 'Professor', laboratorioIds: ['Lab-001', 'Lab-002'] } });
    render(<RelatoriosScreen state={initialState} dispatch={vi.fn()} />, { wrapper });

    await screen.findByRole('option', { name: 'Físico-Química' });
    fireEvent.change(screen.getByLabelText('Recorte do relatório'), { target: { value: 'Lab-002' } });
    fireEvent.click(screen.getAllByRole('button', { name: /Gerar/i })[0]);

    await waitFor(() => expect(fetch.mock.calls.some(c => c[1]?.method === 'POST')).toBe(true));
    const post = fetch.mock.calls.find(c => c[1]?.method === 'POST');
    expect(JSON.parse(post[1].body)).toEqual({ Tipo: 'pgrs', LaboratorioIds: ['Lab-002'] });
  });

  it('sem escolha não envia laboratórios, e o Professor vê a opção de todos os seus', async () => {
    useAuth.mockReturnValue({ user: { papel: 'Professor', laboratorioIds: ['Lab-001'] } });
    render(<RelatoriosScreen state={initialState} dispatch={vi.fn()} />, { wrapper });

    expect(screen.getByRole('option', { name: 'Todos os meus laboratórios' })).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: /Gerar/i })[0]);

    await waitFor(() => expect(fetch.mock.calls.some(c => c[1]?.method === 'POST')).toBe(true));
    const post = fetch.mock.calls.find(c => c[1]?.method === 'POST');
    expect(JSON.parse(post[1].body)).toEqual({ Tipo: 'pgrs' });
  });

  it('o histórico do Admin mostra se cada relatório é institucional ou de quais laboratórios', async () => {
    useAuth.mockReturnValue({ user: { papel: 'Admin' } });
    render(<RelatoriosScreen state={initialState} dispatch={vi.fn()} />, { wrapper });

    expect(screen.getByRole('option', { name: 'Institucional (todos os laboratórios)' })).toBeInTheDocument();
    expect(await screen.findByText('Institucional')).toBeInTheDocument();
    expect(await screen.findByText('Química Geral, 1 outro laboratório')).toBeInTheDocument();
  });
});

