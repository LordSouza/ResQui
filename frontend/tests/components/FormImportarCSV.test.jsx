import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FormImportarCSV } from '../../src/forms/reagentes';

// AuthContext não é exportado; mockamos o hook useAuth diretamente.
vi.mock('../../src/auth/AuthContext', () => ({
  useAuth: () => ({ user: { nome: 'Ana Lima' }, token: 't' }),
}));
vi.mock('../../src/components/ToastContext', () => ({ useToast: () => ({ addToast: vi.fn() }) }));

const CSV = 'Nome,CAS,Quantidade,Unid.,Local,Classe\nEtanol,64-17-5,2.5,L,Lab-201,5\n,,,,,\n';
const CSV_SEM_CLASSE = 'Nome,CAS,Quantidade,Unid.,Local\nEtanol,64-17-5,2.5,L,Lab-201\n';

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('FormImportarCSV', () => {
  let onClose, dispatch, mockFetch;

  beforeEach(() => {
    onClose = vi.fn();
    dispatch = vi.fn();
    vi.stubGlobal('localStorage', {
      data: {},
      setItem(k, v) { this.data[k] = String(v); },
      getItem(k) { return this.data[k] ?? null; },
      removeItem(k) { delete this.data[k]; },
      clear() { this.data = {}; },
    });
    mockFetch = vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: async () => ({ total: 1, importados: 1, erros: [] }),
    });
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('parseia o arquivo e mostra os contadores reais', async () => {
    render(<FormImportarCSV onClose={onClose} dispatch={dispatch} />, { wrapper });

    const file = new File([CSV], 'inv.csv', { type: 'text/csv' });
    const input = screen.getByLabelText(/Selecionar arquivo/i);
    await userEvent.upload(input, file);

    // 1 linha pronta + 1 linha bloqueada (tudo vazio)
    await waitFor(() => expect(screen.getByText(/Etanol/)).toBeInTheDocument());
    expect(screen.getByText(/1 bloqueada/i)).toBeInTheDocument();
  });

  it('importa as linhas prontas via API e mostra o resultado', async () => {
    render(<FormImportarCSV onClose={onClose} dispatch={dispatch} />, { wrapper });

    const file = new File([CSV], 'inv.csv', { type: 'text/csv' });
    await userEvent.upload(screen.getByLabelText(/Selecionar arquivo/i), file);
    await waitFor(() => expect(screen.getByText(/Etanol/)).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: /Importar 1/i }));

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    expect(mockFetch.mock.calls[0][0]).toBe('/api/reagentes/importar-lote');
    const enviado = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(enviado).toHaveLength(1);
    expect(enviado[0]).toMatchObject({ Nome: 'Etanol', Responsavel: 'Ana Lima' });
    await waitFor(() => expect(screen.getByText(/1 reagentes importados|1 importado/i)).toBeInTheDocument());
  });

  it('avisa quando a planilha não tem coluna de classe de reatividade', async () => {
    render(<FormImportarCSV onClose={onClose} dispatch={dispatch} />, { wrapper });

    const file = new File([CSV_SEM_CLASSE], 'inv.csv', { type: 'text/csv' });
    await userEvent.upload(screen.getByLabelText(/Selecionar arquivo/i), file);

    await waitFor(() => expect(screen.getByText(/não tem coluna de classe de reatividade/i)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Importar 0/i })).toBeDisabled();
  });

  it('não mostra o aviso quando a planilha traz a coluna de classe', async () => {
    render(<FormImportarCSV onClose={onClose} dispatch={dispatch} />, { wrapper });

    const file = new File([CSV], 'inv.csv', { type: 'text/csv' });
    await userEvent.upload(screen.getByLabelText(/Selecionar arquivo/i), file);

    await waitFor(() => expect(screen.getByText(/Etanol/)).toBeInTheDocument());
    expect(screen.queryByText(/não tem coluna de classe de reatividade/i)).not.toBeInTheDocument();
  });
});
