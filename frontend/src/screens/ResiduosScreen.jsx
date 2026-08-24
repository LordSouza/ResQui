import { useState } from 'react';
import { Icon, Tag, SectionTitle, Badge, riscoBadge, residuoStatusBadge } from '../components';
import { exportCsv } from '../utils';
import { useResíduos } from '../residuos/useResíduos';
import { useAprovarResiduo } from '../residuos/useAprovarResiduo';
import { useRejeitarResiduo } from '../residuos/useRejeitarResiduo';
import { usePode } from '../auth/permissoes';

const CICLO = [
  ['solicitado', 'Solicitado', 'Aguardando aprovação de um professor ou gestor.'],
  ['aguardando-coleta', 'Aguardando coleta', 'Descarte aprovado — pronto para entrar num manifesto de coleta.'],
  ['em-coleta', 'Em coleta', 'Vinculado a um manifesto de transporte, a caminho da destinação.'],
  ['destinado', 'Destinado', 'Ciclo encerrado — a destinação foi confirmada pelo manifesto.'],
];

const pillBtn = { cursor: 'pointer', background: 'none', border: 'none', font: 'inherit' };

export function ResiduosScreen({ state, dispatch }) {
  const [filter, setFilter] = useState(state.residuosStatusInicial || 'todos');
  const [q, setQ] = useState('');
  const { data: residuos = [], isPending, isError, refetch } = useResíduos();
  const podeAprovar = usePode('Aprovador');     // PUT /api/residuos/:id/aprovar|rejeitar (RF06)
  const podeRegistrar = usePode('Operacional'); // POST /api/residuos
  // PUT /api/residuos/:id exige a policy Tecnico — Pesquisador e Professor criam resíduo
  // (Operacional) mas não o editam, e sem este gate o botão só rendia 403 ao salvar.
  const podeEditar = usePode('Tecnico');
  const aprovar = useAprovarResiduo();
  const rejeitar = useRejeitarResiduo();

  const list = residuos
    .filter((r) => filter === 'todos' || r.status === filter)
    .filter((r) => !q || r.tipo?.toLowerCase().includes(q.toLowerCase()) || r.composicao?.toLowerCase().includes(q.toLowerCase()));
  const etapaAtiva = CICLO.find(([k]) => k === filter);

  if (isPending) return <div className="page-loading"><Icon name="refresh" size={16} /> Carregando...</div>;
  if (isError) return <div className="page-error">Erro ao carregar resíduos. <button onClick={refetch}>Tentar novamente</button></div>;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Resíduos químicos</h1>
          <p className="page-sub">{`Do registro ao destino final · ${residuos.length} registros`}</p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-sm" onClick={() => {
            const rows = [['ID', 'Tipo', 'Gerador', 'Volume', 'Unid.', 'Status', 'Composição', 'Risco', 'MTR', 'Registrado']];
            list.forEach(r => rows.push([r.id, r.tipo, r.lab_id, r.volume, r.unidade, r.status, r.composicao, r.risco, r.mtr_id || '', r.data_registro]));
            exportCsv(rows, `residuos-${new Date().toISOString().slice(0, 10)}.csv`);
          }}><Icon name="download" size={13} /> Exportar lista</button>
          {podeRegistrar && (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => dispatch({ type: 'openModal', kind: 'novoResiduo' })}>
              <Icon name="plus" size={13} /> Registrar resíduo
            </button>
          )}
        </div>
      </div>

      <div className="card card-tight">
        <div className="toolbar" style={{ flexWrap: 'wrap' }}>
          <button type="button" className={`filter-pill ${filter === 'todos' ? 'active' : ''}`} onClick={() => setFilter('todos')} style={pillBtn}>
            Todos <span className="mono small">{residuos.length}</span>
          </button>
          <span className="ciclo-sep">·</span>
          {CICLO.map(([k, rotulo], i) => (
            <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              {i > 0 && <Icon name="chevron_right" size={11}/>}
              <button type="button" className={`filter-pill ${filter === k ? 'active' : ''}`} onClick={() => setFilter(k)} style={pillBtn}>
                {rotulo} <span className="mono small">{residuos.filter(r => r.status === k).length}</span>
              </button>
            </span>
          ))}
          <span className="ciclo-sep">·</span>
          <button type="button" className={`filter-pill ${filter === 'rejeitado' ? 'active' : ''}`} onClick={() => setFilter('rejeitado')} style={pillBtn}>
            Rejeitados <span className="mono small">{residuos.filter(r => r.status === 'rejeitado').length}</span>
          </button>
          <div className="input" style={{ marginLeft: 'auto' }}>
            <Icon name="search" size={14} />
            <input
              aria-label="Buscar resíduo"
              placeholder="Buscar resíduo…"
              value={q}
              onChange={e => setQ(e.target.value)}
            />
          </div>
        </div>
        {etapaAtiva && (
          <div className="ciclo-desc" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span>{etapaAtiva[2]}</span>
            {filter === 'aguardando-coleta' && podeEditar && residuos.some(r => r.status === 'aguardando-coleta') && (
              <button type="button" className="btn btn-sm btn-primary" onClick={() => dispatch({ type: 'openModal', kind: 'novoMtr' })}>
                <Icon name="truck" size={12}/> Criar manifesto de coleta
              </button>
            )}
            {filter === 'em-coleta' && podeEditar && residuos.some(r => r.status === 'em-coleta') && (
              <button type="button" className="btn btn-sm" onClick={() => dispatch({ type: 'nav', screen: 'mtr' })}>
                Confirmar destinação nos manifestos <Icon name="chevron_right" size={12}/>
              </button>
            )}
          </div>
        )}
        <table className="tbl">
          <thead>
            <tr>
              <th>ID</th><th>Tipo</th><th>Composição</th><th>Gerador</th>
              <th className="right">Volume</th><th>Risco</th><th>Status</th>
              <th>Registrado</th><th>MTR</th><th></th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id} className={state.flashId === r.id ? 'flash selected' : ''}>
                <td className="num">{r.id}</td>
                <td>{r.tipo}</td>
                <td className="small muted">{r.composicao}</td>
                <td><Tag>{r.lab_id}</Tag></td>
                <td className="num right">{r.volume} {r.unidade}</td>
                <td>{riscoBadge(r.risco)}</td>
                <td>{residuoStatusBadge(r.status)}</td>
                <td className="mono small muted">{r.data_registro?.slice(0, 10)}</td>
                <td className="mono small">{r.mtr_id || <span className="muted">-</span>}</td>
                <td>
                  {podeAprovar && r.status === 'solicitado' && (
                    <>
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        disabled={aprovar.isPending}
                        onClick={() => aprovar.mutate(r.id)}
                      >
                        Aprovar
                      </button>
                      {' '}
                      <button
                        type="button"
                        className="btn btn-sm"
                        disabled={rejeitar.isPending}
                        onClick={() => {
                          const motivo = window.prompt('Motivo da rejeição (opcional):', '');
                          if (motivo === null) return;
                          rejeitar.mutate({ id: r.id, motivo: motivo || null });
                        }}
                      >
                        Rejeitar
                      </button>
                      {' '}
                    </>
                  )}
                  {podeEditar && (
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => dispatch({ type: 'openModal', kind: 'editarResiduo', residuo: r })}
                    >
                      Editar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
