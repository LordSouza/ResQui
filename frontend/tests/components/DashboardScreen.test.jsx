import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DashboardScreen } from '../../src/screens/DashboardScreen';
import { initialState } from '../../src/store/reducer';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('DashboardScreen', () => {
  beforeEach(() => {
    global.URL.createObjectURL = vi.fn(() => 'blob:test');
    vi.stubGlobal('localStorage', {
      data: {},
      setItem(k, v) { this.data[k] = String(v); },
      getItem(k) { return this.data[k] ?? null; },
      removeItem(k) { delete this.data[k]; },
      clear() { this.data = {}; },
    });
    vi.stubGlobal('fetch', vi.fn((url) => {
      const u = String(url);
      const json = (body) => Promise.resolve({ ok: true, status: 200, json: async () => body });
      if (u.startsWith('/api/residuos/analytics')) return json({ mensal: [], porLab: [] });
      if (u.startsWith('/api/residuos')) return json([
        { status: 'aguardando-coleta', volume: 10, unidade: 'L' },
        { status: 'aguardando-coleta', volume: 5000, unidade: 'mL' },
        { status: 'solicitado', volume: 3, unidade: 'L' },
      ]);
      if (u.startsWith('/api/mtrs')) return json([
        { status: 'pendente-sinir' },
        { status: 'aceito-sinir' },
      ]);
      if (u.startsWith('/api/notificacoes')) return json([]);
      if (u.startsWith('/api/reagentes')) return json({ items: [], total: 847, page: 1, pageSize: 1 });
      return json({});
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders the page title', () => {
    render(<DashboardScreen state={initialState} dispatch={vi.fn()} />, { wrapper });
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
  });

  it('shows inventory KPI section', () => {
    render(<DashboardScreen state={initialState} dispatch={vi.fn()} />, { wrapper });
    // While loading, shows '…'; after load would show total from API
    expect(screen.getByText('Itens em inventário')).toBeInTheDocument();
  });

  it('shows no NaN or undefined in rendered output', () => {
    const { container } = render(<DashboardScreen state={initialState} dispatch={vi.fn()} />, { wrapper });
    expect(container.textContent).not.toContain('NaN');
    expect(container.textContent).not.toContain('undefined');
  });

  it('shows KPI labels', () => {
    render(<DashboardScreen state={initialState} dispatch={vi.fn()} />, { wrapper });
    expect(screen.getByText(/Vencimento/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Resíduos aguardando/i).length).toBeGreaterThan(0);
  });

  it('mostra métricas reais e não os números de conformidade inventados', async () => {
    render(<DashboardScreen state={initialState} dispatch={vi.fn()} />, { wrapper });
    // KPI de conformidade foi substituído por métrica real
    expect(await screen.findByText('MTRs pendentes SINIR')).toBeInTheDocument();
    // conformidade inventada removida
    expect(screen.queryByText(/Conformidade SINIR/i)).toBeNull();
    expect(screen.queryByText(/Rotulagem GHS/i)).toBeNull();
    // volume real dos aguardando: 10 L + 5000 mL = 15 L
    expect(await screen.findByText(/\/ 15 L/)).toBeInTheDocument();
  });
});
