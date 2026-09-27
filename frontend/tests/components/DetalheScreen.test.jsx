// frontend/tests/components/DetalheScreen.test.jsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DetalheScreen } from '../../src/screens/DetalheScreen';
import { initialState } from '../../src/store/reducer';

vi.mock('../../src/compat/useCompatMatriz', () => ({
  useCompatMatriz: vi.fn(),
}));
vi.mock('../../src/reagentes/useReagente', () => ({
  useReagente: vi.fn(),
}));
vi.mock('../../src/reagentes/useReagentes', () => ({
  useReagentes: vi.fn(),
}));
vi.mock('../../src/reagentes/useDeletarReagente', () => ({
  useDeletarReagente: vi.fn(),
}));
vi.mock('../../src/reagentes/useLotes', () => ({
  useLotes: vi.fn(),
}));
vi.mock('../../src/reagentes/useCriarLote', () => ({
  useCriarLote: vi.fn(),
}));
vi.mock('../../src/reagentes/useBaixaLote', () => ({
  useBaixaLote: vi.fn(),
}));
vi.mock('../../src/reagentes/useMovimentacoes', () => ({
  useMovimentacoes: vi.fn(),
}));
vi.mock('../../src/reagentes/useQrRotulo', () => ({
  useQrRotulo: vi.fn(),
}));
vi.mock('../../src/auth/AuthContext', () => ({
  useAuth: vi.fn(),
}));

import { useCompatMatriz } from '../../src/compat/useCompatMatriz';
import { useReagente } from '../../src/reagentes/useReagente';
import { useReagentes } from '../../src/reagentes/useReagentes';
import { useDeletarReagente } from '../../src/reagentes/useDeletarReagente';
import { useLotes } from '../../src/reagentes/useLotes';
import { useCriarLote } from '../../src/reagentes/useCriarLote';
import { useBaixaLote } from '../../src/reagentes/useBaixaLote';
import { useMovimentacoes } from '../../src/reagentes/useMovimentacoes';
import { useAuth } from '../../src/auth/AuthContext';
import { useQrRotulo } from '../../src/reagentes/useQrRotulo';

// r é classe 1; x (mesmo armário) é classe 3 — nível 3 (Proibido) na matriz mockada.
const reagente = {
  id: 'R-00001', nome: 'Acetona', cas: '67-64-1', formula: 'C3H6O', sinonimo: 'Propanona',
  classe: 1, local: 'Lab A · Armário 1', responsavel: 'Fulano', estoque: 10, unidade: 'L',
  estoque_min: 5, validade: '2027-01-01', validade_status: 'ok', lote: 'L-1', controlado: false,
  pictos: [], signal: 'Perigo', h: [], p: [], abertura: '2026-01-01',
};

const vizinho = {
  id: 'R-00002', nome: 'Ácido nítrico', local: 'Lab A · Armário 1', classe: 3,
};

const baseMatrix = { 1: [0, 1, 3], 2: [1, 0, 2], 3: [3, 2, 0] };
const baseFonte = {
  fonte: 'EPA-600/2-80-076',
  referencia: 'Johnson, L. E. & Farr, J. K. (2008).',
  url: 'https://www.epa.gov/',
  revisadoEm: '2026-07-27',
  detalhamento: 'docs/compatibilidade-proveniencia.md',
};

beforeEach(() => {
  useCompatMatriz.mockReturnValue({ data: { matrix: baseMatrix, fonte: baseFonte }, isPending: false, isError: false });
  useReagente.mockReturnValue({ data: reagente, isPending: false, isError: false, refetch: vi.fn() });
  useReagentes.mockReturnValue({ data: { items: [reagente, vizinho], total: 2 }, isPending: false, isError: false });
  useDeletarReagente.mockReturnValue({ mutate: vi.fn(), isPending: false });
  useLotes.mockReturnValue({ data: [], isPending: false });
  useCriarLote.mockReturnValue({ mutate: vi.fn(), isPending: false });
  useBaixaLote.mockReturnValue({ mutate: vi.fn(), isPending: false });
  useMovimentacoes.mockReturnValue({ data: [], isPending: false });
  useAuth.mockReturnValue({ user: { papel: 'Professor' } });
  useQrRotulo.mockReturnValue({ data: undefined });
});

afterEach(() => vi.clearAllMocks());

describe('DetalheScreen', () => {
  it('deriva a matriz do shape { matrix, fonte } e não trata pares de alto risco como compatíveis', () => {
    render(<DetalheScreen state={{ ...initialState, detailId: 'R-00001' }} dispatch={vi.fn()} />);

    // classe 1 x classe 3 = nível 3 (Proibido) na matriz mockada — nunca "Compatível".
    expect(screen.getByText('Proibido')).toBeInTheDocument();
    expect(screen.queryByText('Compatível')).not.toBeInTheDocument();
  });

  it('compara por laboratório e armário, ignorando a prateleira, e lista primeiro o par de maior risco', () => {
    const outroArmario = { id: 'R-00003', nome: 'Hidróxido de sódio', local: 'Lab A · Armário 2', classe: 3 };
    const compativel = { id: 'R-00004', nome: 'Ácido clorídrico', local: 'Lab A · Armário 1 · Pra. 2', classe: 1 };
    useReagentes.mockReturnValue({ data: { items: [reagente, compativel, outroArmario, vizinho], total: 4 }, isPending: false, isError: false });
    render(<DetalheScreen state={{ ...initialState, detailId: 'R-00001' }} dispatch={vi.fn()} />);
    const nomes = screen.getAllByText(/^(Ácido nítrico|Ácido clorídrico|Hidróxido de sódio)$/).map(el => el.textContent);
    expect(nomes).toEqual(['Ácido nítrico', 'Ácido clorídrico']);
  });

  it('não afirma armário vazio quando só parte do inventário foi carregada', () => {
    useReagentes.mockReturnValue({ data: { items: [reagente], total: 350 }, isPending: false, isError: false });
    render(<DetalheScreen state={{ ...initialState, detailId: 'R-00001' }} dispatch={vi.fn()} />);
    expect(screen.queryByText(/Nenhum outro reagente/)).not.toBeInTheDocument();
    expect(screen.getByText(/primeiros 1 de 350 reagentes/)).toBeInTheDocument();
  });
});

// Três policies distintas convivem nesta tela: baixa direta, transferência e baixa de lote são
// Operacional; criar lote é Operacao; editar e excluir reagente são Cadastro.
describe('DetalheScreen — permissões', () => {
  const renderCom = (papel) => {
    useAuth.mockReturnValue({ user: { papel } });
    return render(<DetalheScreen state={{ ...initialState, detailId: 'R-00001' }} dispatch={vi.fn()} />);
  };

  beforeEach(() => {
    useLotes.mockReturnValue({
      data: [{ id: 1, codigo: 'L-001', estoque: 4, validade: '2027-01-01', validadeStatus: 'ok' }],
      isPending: false,
    });
  });

  it('Professor alcança todas as ações do reagente', () => {
    renderCom('Professor');
    expect(screen.getByRole('button', { name: /Baixar consumo/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Transferir/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Novo lote/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Baixa$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Editar$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Excluir/i })).toBeInTheDocument();
  });

  // Aluno tem Operacional — as duas baixas decrementam o mesmo saldo, e o gate delas é o mesmo.
  it('Aluno baixa reagente e lote e transfere, mas não cria lote, edita nem exclui', () => {
    renderCom('Aluno');
    expect(screen.getByRole('button', { name: /Baixar consumo/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Transferir/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Baixa$/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Novo lote/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Editar$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Excluir/i })).not.toBeInTheDocument();
  });

  it('mantém leitura para todos: rótulo PDF e resumo de segurança', () => {
    renderCom('Aluno');
    expect(screen.getByRole('button', { name: /Rótulo PDF/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Resumo de segurança/i })).toBeInTheDocument();
  });
});

describe('DetalheScreen — rótulo GHS espelha o PDF', () => {
  const rotulo = () => document.querySelector('.ghs-label');
  const renderRotulo = (overrides = {}) => {
    useReagente.mockReturnValue({ data: { ...reagente, ...overrides }, isPending: false, isError: false, refetch: vi.fn() });
    render(<DetalheScreen state={{ ...initialState, detailId: 'R-00001' }} dispatch={vi.fn()} />);
  };

  it('traz os campos do PDF: classe, datas em dd/MM/yyyy e responsável completo', () => {
    renderRotulo({ responsavel: 'Ana Maria de Souza' });
    const texto = rotulo().textContent;
    expect(texto).toContain('Classe de reatividade: 1');
    expect(texto).toContain('Validade: 01/01/2027');
    expect(texto).toContain('Aberto em: 01/01/2026');
    expect(texto).toContain('Responsável: Ana Maria de Souza');
    expect(texto).toContain('Lote: L-1');
    expect(texto).toContain('PERIGO');
  });

  it('mostra todos os pictogramas com o nome de cada um', () => {
    renderRotulo({ pictos: ['explosion', 'flame', 'flame_circle', 'bottle', 'corrosion', 'skull', 'exclam', 'health', 'envir'] });
    expect(rotulo().querySelectorAll('.ghs-picto-item')).toHaveLength(9);
    expect(rotulo().textContent).toContain('Perigoso ao ambiente');
  });

  it('omite o que o PDF omite quando o dado está vazio', () => {
    renderRotulo({ sinonimo: null, lote: null, abertura: '', signal: '', h: [], p: [] });
    const texto = rotulo().textContent;
    expect(texto).not.toContain('Lote:');
    expect(texto).not.toContain('Aberto');
    expect(texto).not.toContain('Frases H');
    expect(texto).not.toContain('Frases P');
    expect(rotulo().querySelector('.ghs-signal')).toBeNull();
    expect(rotulo().querySelector('.ghs-syn')).toBeNull();
  });

  it('exibe o QR code servido pelo backend quando ele chega', () => {
    useQrRotulo.mockReturnValue({ data: 'data:image/png;base64,AAAA' });
    renderRotulo();
    expect(screen.getByAltText('QR code de R-00001')).toHaveAttribute('src', 'data:image/png;base64,AAAA');
  });
});

describe('DetalheScreen — confirmações em modal', () => {
  beforeEach(() => {
    vi.spyOn(window, 'confirm');
    vi.spyOn(window, 'prompt');
    useLotes.mockReturnValue({
      data: [{ id: 7, codigo: 'L-001', estoque: 4, validade: '2027-01-01', validadeStatus: 'ok' }],
      isPending: false,
    });
  });

  const renderTela = (dispatch = vi.fn()) =>
    render(<DetalheScreen state={{ ...initialState, detailId: 'R-00001' }} dispatch={dispatch} />);

  it('excluir abre um modal e só apaga depois de confirmado nele', () => {
    const mutate = vi.fn();
    useDeletarReagente.mockReturnValue({ mutate, isPending: false });
    renderTela();

    fireEvent.click(screen.getByRole('button', { name: /^Excluir$/i }));

    expect(screen.getByRole('dialog', { name: /Excluir Acetona\?/ })).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Sim, excluir/i }));
    expect(mutate).toHaveBeenCalledWith('R-00001', expect.any(Object));
    expect(window.confirm).not.toHaveBeenCalled();
  });

  it('baixa de lote abre um modal com a quantidade e envia o lote certo', () => {
    const mutate = vi.fn();
    useBaixaLote.mockReturnValue({ mutate, isPending: false });
    renderTela();

    fireEvent.click(screen.getByRole('button', { name: /^Baixa$/i }));
    fireEvent.change(screen.getByLabelText(/Quantidade/i), { target: { value: '1.5' } });
    fireEvent.click(screen.getByRole('button', { name: /Confirmar baixa/i }));

    expect(mutate).toHaveBeenCalledWith({ loteId: 7, quantidade: 1.5 }, expect.any(Object));
    expect(window.prompt).not.toHaveBeenCalled();
  });

  it('baixa de lote acima do disponível mostra erro no modal e não chama a API', () => {
    const mutate = vi.fn();
    useBaixaLote.mockReturnValue({ mutate, isPending: false });
    renderTela();

    fireEvent.click(screen.getByRole('button', { name: /^Baixa$/i }));
    fireEvent.change(screen.getByLabelText(/Quantidade/i), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: /Confirmar baixa/i }));

    expect(screen.getByText(/maior que o disponível no lote \(4 L\)/)).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });

  it('novo lote incompleto mostra o erro na linha, sem alert', () => {
    vi.spyOn(window, 'alert');
    const mutate = vi.fn();
    useCriarLote.mockReturnValue({ mutate, isPending: false });
    renderTela();

    fireEvent.click(screen.getByRole('button', { name: /Novo lote/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Salvar$/i }));

    expect(screen.getByText('Código, estoque e validade são obrigatórios.')).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
    expect(window.alert).not.toHaveBeenCalled();
  });
});
