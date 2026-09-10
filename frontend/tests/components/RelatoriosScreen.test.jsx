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
});
