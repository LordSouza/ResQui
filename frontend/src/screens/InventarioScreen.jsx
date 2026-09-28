import { useState, useEffect } from 'react';
import { Icon, Badge } from '../components';
import { REATIVIDADE_CLASSES, PICTOS_GHS } from '../data';
import { validadeBadge } from '../components';
import { useReagentes } from '../reagentes/useReagentes';
import { usePode } from '../auth/permissoes';

function contagemDeItens(total) {
  return total === 1 ? '1 item cadastrado' : `${total} itens cadastrados`;
}

function contagemDeResultados(total) {
  return total === 1 ? '1 resultado' : `${total} resultados`;
}

export function InventarioScreen({ state, dispatch }) {
  const podeCadastrar = usePode('Cadastro'); // POST /api/reagentes e /importar-lote
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [classe, setClasse] = useState('todas');
  const [vencimento, setVencimento] = useState(state.inventarioVencendoInicial ? 'em-breve' : 'todos');
  const [page, setPage] = useState(0);
  const perPage = 20;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const { data, isPending, isError, refetch } = useReagentes({
    page: page + 1,
    pageSize: perPage,
    q: debouncedQ,
    classe: classe !== 'todas' ? classe : null,
    vencendo: vencimento === 'em-breve',
  });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const safePage = page >= totalPages ? 0 : page;
  const pageItems = data?.items ?? [];

  const handleQChange = (e) => { setQ(e.target.value); setPage(0); };
  const handleClasseChange = (e) => { setClasse(e.target.value); setPage(0); };
  const handleVencimentoChange = (e) => { setVencimento(e.target.value); setPage(0); };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventário de reagentes</h1>
          <p className="page-sub">{contagemDeItens(total)}</p>
        </div>
        <div className="page-actions">
          {podeCadastrar && (
            <>
              <button type="button" className="btn btn-sm" onClick={() => dispatch({type: 'openModal', kind: 'importarCsv'})}><Icon name="upload" size={13}/> Importar Excel</button>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => dispatch({type: 'openModal', kind: 'novoReagente'})}>
                <Icon name="plus" size={13}/> Novo reagente
              </button>
            </>
          )}
        </div>
      </div>

      <div className="card card-tight">
        <div className="toolbar">
          <div className="input">
            <Icon name="search" size={14}/>
            <input aria-label="Buscar reagentes" placeholder="Buscar por nome, CAS, ID ou fórmula…" value={q} onChange={handleQChange}/>
          </div>
          <select aria-label="Filtrar por classe de reatividade" value={classe} onChange={handleClasseChange}>
            <option value="todas">Todas as classes</option>
            {Object.entries(REATIVIDADE_CLASSES).map(([k, v]) => <option key={k} value={k}>{k}. {v}</option>)}
          </select>
          <select aria-label="Filtrar por vencimento" value={vencimento} onChange={handleVencimentoChange}>
            <option value="todos">Vencimento: todos</option>
            <option value="em-breve">≤ 90 dias</option>
          </select>
          <span className={`filter-pill ${state.flashId ? 'active' : ''}`}><Icon name="filter" size={11}/> {contagemDeResultados(total)}</span>
        </div>

        {isPending && (
          <div className="page-loading"><Icon name="refresh" size={16}/> Carregando...</div>
        )}

        {isError && (
          <div className="page-error">
            Erro ao carregar dados. <button type="button" onClick={refetch}>Tentar novamente</button>
          </div>
        )}

        {!isPending && !isError && (
          <table className="tbl">
            <thead>
              <tr>
                <th>ID</th>
                <th>Reagente</th>
                <th>CAS</th>
                <th>Classe</th>
                <th>Local</th>
                <th className="right">Estoque</th>
                <th>Validade</th>
                <th>Controle</th>
                <th>Risco</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map(r => (
                <tr key={r.id}
                  className={state.flashId === r.id ? 'flash selected' : ''}
                  tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); dispatch({type: 'detail', id: r.id}); } }}
                  onClick={() => dispatch({type: 'detail', id: r.id})}>
                  <td className="num">{r.id}</td>
                  <td>
                    <div style={{fontWeight: 500}}>{r.nome}</div>
                    <div className="mono small muted">{r.sinonimo}</div>
                  </td>
                  <td className="num">{r.cas}</td>
                  <td>{r.classe}. {REATIVIDADE_CLASSES[r.classe]}</td>
                  <td className="small muted">{r.local}</td>
                  <td className="num right" style={{color: r.estoque_min && r.estoque < r.estoque_min ? 'var(--red)' : 'inherit', fontWeight: r.estoque_min && r.estoque < r.estoque_min ? 600 : 400}}>
                    {r.estoque?.toFixed(1)} {r.unidade}
                  </td>
                  <td>
                    <div className="mono small">{r.validade}</div>
                    <div style={{marginTop: 2}}>{validadeBadge(r.validade_status)}</div>
                  </td>
                  <td>{r.controlado ? <Badge kind="purple">Controlado</Badge> : <span className="muted small">-</span>}</td>
                  <td>
                    <div style={{display: 'flex', gap: 2}}>
                      {(r.pictos ?? []).slice(0, 3).map((p) => (
                        <span key={p} title={PICTOS_GHS[p]?.label}
                          style={{width: 18, height: 18, border: '1.5px solid var(--red)', transform: 'rotate(45deg)', display: 'inline-block'}}/>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div style={{padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', background: 'var(--surface-2)'}}>
          <span className="small muted">{contagemDeResultados(total)} · página {safePage + 1} de {totalPages}</span>
          <div className="row">
            <button type="button" className="btn btn-sm" aria-label="Página anterior" disabled={safePage === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>‹</button>
            <button type="button" className="btn btn-sm" aria-label="Próxima página" disabled={safePage >= totalPages - 1} onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}>›</button>
          </div>
        </div>
      </div>
    </>
  );
}
