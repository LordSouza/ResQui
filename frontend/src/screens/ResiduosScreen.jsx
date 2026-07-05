import { useState } from 'react';
import { Icon, Tag, SectionTitle, Badge, riscoBadge, residuoStatusBadge } from '../components';
import { exportCsv } from '../utils';
import { useResíduos } from '../residuos/useResíduos';
import { useAprovarResiduo } from '../residuos/useAprovarResiduo';
import { useRejeitarResiduo } from '../residuos/useRejeitarResiduo';
import { useAuth } from '../auth/AuthContext';

const STATUS_TABS = [
  ['todos', 'Todos'],
  ['solicitado', 'Solicitados'],
  ['aguardando-coleta', 'Aguardando coleta'],
  ['em-coleta', 'Em coleta'],
  ['rotulagem', 'Rotulagem'],
  ['destinado', 'Destinados'],
  ['rejeitado', 'Rejeitados'],
];

export function ResiduosScreen({ state, dispatch }) {
  const [filter, setFilter] = useState('todos');
  const [q, setQ] = useState('');
  const { data: residuos = [], isPending, isError, refetch } = useResíduos();
  const { user } = useAuth();
  const podeAprovar = user?.papel === 'Admin' || user?.papel === 'Gestor' || user?.papel === 'Professor';
  const aprovar = useAprovarResiduo();
  const rejeitar = useRejeitarResiduo();

  const list = residuos
    .filter((r) => filter === 'todos' || r.status === filter)
    .filter((r) => !q || r.tipo?.toLowerCase().includes(q.toLowerCase()) || r.composicao?.toLowerCase().includes(q.toLowerCase()));

  if (isPending) return <div className="page-loading"><Icon name="refresh" size={16} /> Carregando...</div>;
  if (isError) return <div className="page-error">Erro ao carregar resíduos. <button onClick={refetch}>Tentar novamente</button></div>;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Resíduos químicos</h1>
          <p className="page-sub">Rastreabilidade do berço ao destino · base PNRS Lei 12.305/2010 · {residuos.length} registros</p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-sm" onClick={() => {
            const rows = [['ID', 'Tipo', 'Gerador', 'Volume', 'Unid.', 'Status', 'Composição', 'Risco', 'MTR', 'Registrado']];
            list.forEach(r => rows.push([r.id, r.tipo, r.lab_id, r.volume, r.unidade, r.status, r.composicao, r.risco, r.mtr_id || '', r.data_registro]));
            exportCsv(rows, `residuos-${new Date().toISOString().slice(0, 10)}.csv`);
          }}><Icon name="download" size={13} /> Exportar lista</button>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => dispatch({ type: 'openModal', kind: 'novoResiduo' })}>
            <Icon name="plus" size={13} /> Registrar resíduo
          </button>
        </div>
      </div>

      <div className="card card-tight">
        <div className="toolbar">
          {STATUS_TABS.map(([k, l]) => (
            <button
              key={k}
              type="button"
              className={`filter-pill ${filter === k ? 'active' : ''}`}
              onClick={() => setFilter(k)}
              style={{ cursor: 'pointer', background: 'none', border: 'none', font: 'inherit' }}
            >
              {l} <span className="mono small">{k === 'todos' ? residuos.length : residuos.filter(r => r.status === k).length}</span>
            </button>
          ))}
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
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => dispatch({ type: 'openModal', kind: 'editarResiduo', residuo: r })}
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
