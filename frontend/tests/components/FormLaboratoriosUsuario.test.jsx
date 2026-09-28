import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FormLaboratoriosUsuario from '../../src/forms/FormLaboratoriosUsuario';
import { ToastProvider } from '../../src/components/ToastContext';

vi.mock('../../src/auth/AuthContext', () => ({ useAuth: vi.fn() }));
import { useAuth } from '../../src/auth/AuthContext';

const LABS = [
  { id: 'Lab-001', nome: 'Química Geral' },
  { id: 'Lab-002', nome: 'Físico-Química' },
];

function wrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={qc}><ToastProvider>{children}</ToastProvider></QueryClientProvider>;
}

describe('FormLaboratoriosUsuario', () => {
  let onClose;

  beforeEach(() => {
    onClose = vi.fn();
    vi.stubGlobal('localStorage', {
      data: {},
      setItem(k, v) { this.data[k] = String(v); },
      getItem(k) { return this.data[k] ?? null; },
      removeItem(k) { delete this.data[k]; },
      clear() { this.data = {}; },
    });
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url) =>
      String(url).startsWith('/api/laboratorios')
        ? Promise.resolve({ ok: true, status: 200, json: async () => LABS })
        : Promise.resolve({ ok: true, status: 204, text: async () => '' })));
  });
  afterEach(() => vi.unstubAllGlobals());

  const aluno = (laboratorioIds = []) => ({ id: 'u-2', nome: 'Bruno', papel: 'Aluno', laboratorioIds });

  it('oferece só os laboratórios pelos quais o solicitante responde', async () => {
    useAuth.mockReturnValue({ user: { id: 'u-1', papel: 'Professor', laboratorioIds: ['Lab-001'] } });
    render(<FormLaboratoriosUsuario usuario={aluno()} onClose={onClose} />, { wrapper });

    expect(await screen.findByText('Química Geral')).toBeInTheDocument();
    expect(screen.queryByText('Físico-Química')).not.toBeInTheDocument();
  });

  it('Admin oferece todos os laboratórios', async () => {
    useAuth.mockReturnValue({ user: { id: 'adm', papel: 'Admin' } });
    render(<FormLaboratoriosUsuario usuario={aluno()} onClose={onClose} />, { wrapper });

    expect(await screen.findByText('Química Geral')).toBeInTheDocument();
    expect(screen.getByText('Físico-Química')).toBeInTheDocument();
  });

  it('mostra como preservado o vínculo que o solicitante não pode mexer, sem o nome, e não o envia', async () => {
    fetch.mockImplementation((url) =>
      String(url).startsWith('/api/laboratorios')
        ? Promise.resolve({ ok: true, status: 200, json: async () => [LABS[0]] })
        : Promise.resolve({ ok: true, status: 204, text: async () => '' }));
    useAuth.mockReturnValue({ user: { id: 'u-1', papel: 'Professor', laboratorioIds: ['Lab-001'] } });
    render(<FormLaboratoriosUsuario usuario={aluno(['Lab-001', 'Lab-002', 'Lab-003'])} onClose={onClose} />, { wrapper });

    expect(await screen.findByText(/Preservados/)).toBeInTheDocument();
    expect(screen.getByText('2 outros laboratórios')).toBeInTheDocument();
    expect(screen.queryByText('Físico-Química')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    const put = fetch.mock.calls.find(c => c[1]?.method === 'PUT');
    expect(JSON.parse(put[1].body)).toEqual({ LaboratorioIds: ['Lab-001'] });
  });

  it('escopo ainda não hidratado carrega, em vez de anunciar que não há laboratório', async () => {
    useAuth.mockReturnValue({ user: { id: 'u-1', papel: 'Professor' } });
    render(<FormLaboratoriosUsuario usuario={aluno(['Lab-001', 'Lab-002'])} onClose={onClose} />, { wrapper });

    expect(await screen.findByText(/Carregando os laboratórios/)).toBeInTheDocument();
    expect(screen.queryByText(/não responde por nenhum laboratório/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Preservados/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled();
  });

  it('desmarcar um laboratório o remove da lista enviada', async () => {
    useAuth.mockReturnValue({ user: { id: 'adm', papel: 'Admin' } });
    render(<FormLaboratoriosUsuario usuario={aluno(['Lab-001', 'Lab-002'])} onClose={onClose} />, { wrapper });

    await userEvent.click(await screen.findByRole('checkbox', { name: /Química Geral/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    const put = fetch.mock.calls.find(c => c[1]?.method === 'PUT');
    expect(JSON.parse(put[1].body)).toEqual({ LaboratorioIds: ['Lab-002'] });
  });
});
