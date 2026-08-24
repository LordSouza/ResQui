import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { InventarioScreen } from '../../src/screens/InventarioScreen';
import { initialState } from '../../src/store/reducer';

const MOCK_ITEMS = [
  {
    id: 'R-00128',
    nome: 'Ácido Clorídrico',
    sinonimo: 'HCl',
    cas: '7647-01-0',
    formula: 'HCl',
    classeReatividade: 8,
    validadeStatus: 'ok',
    validade: '2026-12-01',
    estoqueMin: 0.5,
    estoque: 2.0,
    unidade: 'L',
    local: 'Lab 1',
    controlado: false,
    ghs: { pictos: ['corrosive'], signal: 'Perigo', frasesH: [], frasesP: [] },
  },
  {
    id: 'R-00129',
    nome: 'Ácido Sulfúrico',
    sinonimo: 'H2SO4',
    cas: '7664-93-9',
    formula: 'H2SO4',
    classeReatividade: 8,
    validadeStatus: 'ok',
    validade: '2026-11-01',
    estoqueMin: 0.5,
    estoque: 1.5,
    unidade: 'L',
    local: 'Lab 1',
    controlado: false,
    ghs: { pictos: ['corrosive'], signal: 'Perigo', frasesH: [], frasesP: [] },
  },
];

function makeApiResponse(items) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ items, total: items.length, page: 1, pageSize: 20 }),
  };
}

vi.mock('../../src/auth/AuthContext', () => ({ useAuth: vi.fn() }));
import { useAuth } from '../../src/auth/AuthContext';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('InventarioScreen', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      data: {},
      setItem(k, v) { this.data[k] = String(v); },
      getItem(k) { return this.data[k] ?? null; },
      removeItem(k) { delete this.data[k]; },
      clear() { this.data = {}; },
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeApiResponse(MOCK_ITEMS)));
    useAuth.mockReturnValue({ user: { id: 'u-1', papel: 'Admin' } });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('renders the page title', () => {
    render(<InventarioScreen state={initialState} dispatch={vi.fn()} />, { wrapper });
    expect(screen.getByText('Inventário de reagentes')).toBeInTheDocument();
  });

  it('shows the first reagent from data', async () => {
    render(<InventarioScreen state={initialState} dispatch={vi.fn()} />, { wrapper });
    await waitFor(() => expect(screen.getByText('Ácido Clorídrico')).toBeInTheDocument());
  });

  it('filters by name when search input is typed', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(makeApiResponse(MOCK_ITEMS))
      .mockResolvedValue(makeApiResponse([MOCK_ITEMS[1]]));
    vi.stubGlobal('fetch', fetchMock);

    render(<InventarioScreen state={initialState} dispatch={vi.fn()} />, { wrapper });
    await waitFor(() => expect(screen.getByText('Ácido Clorídrico')).toBeInTheDocument());

    const input = screen.getByPlaceholderText(/Buscar por nome/i);
    await userEvent.type(input, 'Sulfúrico');

    await waitFor(() => {
      expect(screen.getByText('Ácido Sulfúrico')).toBeInTheDocument();
      expect(screen.queryByText('Ácido Clorídrico')).not.toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('dispatches detail action when a reagent row is clicked', async () => {
    const dispatch = vi.fn();
    render(<InventarioScreen state={initialState} dispatch={dispatch} />, { wrapper });
    await waitFor(() => expect(screen.getByText('Ácido Clorídrico')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Ácido Clorídrico'));
    expect(dispatch).toHaveBeenCalledWith({ type: 'detail', id: 'R-00128' });
  });

  it('dispatches openModal novoReagente when Novo reagente button is clicked', async () => {
    const dispatch = vi.fn();
    render(<InventarioScreen state={initialState} dispatch={dispatch} />, { wrapper });
    await userEvent.click(screen.getByRole('button', { name: /Novo reagente/i }));
    expect(dispatch).toHaveBeenCalledWith({ type: 'openModal', kind: 'novoReagente' });
  });

  it('dispatches openModal importarCsv when Importar CSV button is clicked', async () => {
    const dispatch = vi.fn();
    render(<InventarioScreen state={initialState} dispatch={dispatch} />, { wrapper });
    await userEvent.click(screen.getByRole('button', { name: /Importar CSV/i }));
    expect(dispatch).toHaveBeenCalledWith({ type: 'openModal', kind: 'importarCsv' });
  });

  // POST /api/reagentes e POST /api/reagentes/importar-lote exigem a policy Gestor.
  it.each(['Tecnico', 'Professor', 'Pesquisador', 'Visualizador'])('esconde criar e importar de %s', (papel) => {
    useAuth.mockReturnValue({ user: { id: 'u-1', papel } });
    render(<InventarioScreen state={initialState} dispatch={vi.fn()} />, { wrapper });
    expect(screen.queryByRole('button', { name: /Novo reagente/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Importar CSV/i })).not.toBeInTheDocument();
  });

  it('mostra criar e importar para Gestor', () => {
    useAuth.mockReturnValue({ user: { id: 'u-1', papel: 'Gestor' } });
    render(<InventarioScreen state={initialState} dispatch={vi.fn()} />, { wrapper });
    expect(screen.getByRole('button', { name: /Novo reagente/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Importar CSV/i })).toBeInTheDocument();
  });

  it('abre já filtrado por vencimento quando a navegação pede', async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeApiResponse([]));
    vi.stubGlobal('fetch', fetchMock);

    render(<InventarioScreen state={{ inventarioVencendoInicial: true }} dispatch={vi.fn()} />, { wrapper });

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('vencendo=true'))).toBe(true);
  });
});
