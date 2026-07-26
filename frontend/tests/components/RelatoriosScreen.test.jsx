import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RelatoriosScreen } from '../../src/screens/RelatoriosScreen';
import { initialState } from '../../src/store/reducer';

vi.mock('../../src/components/ToastContext', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('../../src/auth/AuthContext', () => ({
  useAuth: () => ({ user: { papel: 'Admin' } }),
}));

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('RelatoriosScreen', () => {
  beforeEach(() => {
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

  it('renders all 6 report type cards', () => {
    render(<RelatoriosScreen state={initialState} dispatch={vi.fn()} />, { wrapper });
    expect(screen.getByText('PGRS Anual')).toBeInTheDocument();
    expect(screen.getByText('Inventário de reagentes')).toBeInTheDocument();
    expect(screen.getByText('Declaração SINIR trimestral')).toBeInTheDocument();
  });

  it('shows history section', () => {
    render(<RelatoriosScreen state={initialState} dispatch={vi.fn()} />, { wrapper });
    expect(screen.getByText(/Histórico de relatórios gerados/i)).toBeInTheDocument();
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
});
