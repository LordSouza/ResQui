import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { executeAction } from '../../../src/chat/ChatMCP';

const REAGS = [
  { id: 'R-001', nome: 'HCl', classe: 1, estoque: 2.4, unidade: 'L' },
  { id: 'R-002', nome: 'H2O2', classe: 4, estoque: 1.5, unidade: 'L' },
];
const RESIDS = [
  { id: 1, tipo: 'Solventes', volume: 5, unidade: 'L', status: 'aguardando-coleta', lab_id: 2 },
  { id: 2, tipo: 'Ácidos', volume: 2, unidade: 'kg', status: 'em-coleta', lab_id: 1 },
];

describe('executeAction (ChatMCP)', () => {
  let deps, mockFetch;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('localStorage', {
      data: {},
      setItem(k, v) { this.data[k] = String(v); },
      getItem(k) { return this.data[k] ?? null; },
      removeItem(k) { delete this.data[k]; },
      clear() { this.data = {}; },
    });
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
    deps = {
      reagentes: REAGS,
      residuos: RESIDS,
      addCard: vi.fn(),
      dispatch: vi.fn(),
      queryClient: { invalidateQueries: vi.fn() },
    };
  });

  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it('compat consulta GET /api/compat e adiciona card com o nível', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ classeA: 1, classeB: 4, nivel: 3, descricao: 'Proibido' }) });
    await executeAction('compat', { a: 'R-001', b: 'R-002' }, deps);
    expect(mockFetch.mock.calls[0][0]).toContain('/api/compat?');
    expect(deps.addCard).toHaveBeenCalledWith(expect.objectContaining({ kind: 'compat', score: 3 }));
  });

  it('compat com reagente desconhecido adiciona card de erro sem chamar a API', async () => {
    await executeAction('compat', { a: 'R-999', b: 'R-001' }, deps);
    expect(mockFetch).not.toHaveBeenCalled();
    expect(deps.addCard).toHaveBeenCalledWith(expect.objectContaining({ title: 'Erro' }));
  });

  it('consume faz POST de baixa e invalida a query de reagentes', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ estoque: 1.9 }) });
    await executeAction('consume', { id: 'R-001', quantidade: 0.5 }, deps);
    expect(mockFetch.mock.calls[0][0]).toBe('/api/reagentes/R-001/baixa');
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({ Quantidade: 0.5 });
    expect(deps.queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['reagentes'] });
    expect(deps.addCard).toHaveBeenCalledWith(expect.objectContaining({ kind: 'consume', novo: 1.9 }));
  });

  it('consume com erro 400 mostra a mensagem do servidor no card de erro', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 400, text: async () => JSON.stringify({ message: 'Estoque insuficiente: 2.4 L disponíveis.' }) });
    await executeAction('consume', { id: 'R-001', quantidade: 99 }, deps);
    expect(deps.addCard).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Erro',
      items: [expect.objectContaining({ nome: 'Estoque insuficiente: 2.4 L disponíveis.' })],
    }));
  });

  it('registerWaste faz POST /api/residuos e invalida a query de resíduos', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ id: 7, tipo: 'Solventes', volume: 2, unidade: 'L', laboratorioId: 2 }) });
    await executeAction('registerWaste', { tipo: 'Solventes', volume: 2, unidade: 'L', gerador: 'Lab-002', composicao: 'acetona', risco: 'medio' }, deps);
    expect(mockFetch.mock.calls[0][0]).toBe('/api/residuos');
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toMatchObject({ LaboratorioId: 2, Volume: 2, Risco: 'medio' });
    expect(deps.queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['residuos'] });
    expect(deps.addCard).toHaveBeenCalledWith(expect.objectContaining({ kind: 'waste' }));
  });

  it('createMtr usa resíduos aguardando-coleta da API (sem fetch extra)', async () => {
    await executeAction('createMtr', {}, deps);
    expect(deps.addCard).toHaveBeenCalledWith(expect.objectContaining({ kind: 'mtr', count: 1 }));
  });

  it('listExpiring consulta GET /api/reagentes?vencendo=true', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ items: [{ id: 'R-001', nome: 'HCl', validadeStatus: 'vencendo', estoque: 2.4, unidade: 'L' }], total: 1 }) });
    await executeAction('listExpiring', {}, deps);
    expect(mockFetch.mock.calls[0][0]).toContain('vencendo=true');
    expect(deps.addCard).toHaveBeenCalledWith(expect.objectContaining({ kind: 'list', items: [expect.objectContaining({ id: 'R-001' })] }));
  });
});
