import { useState } from 'react';
import { Icon, Tag, SectionTitle, Badge, riscoBadge, residuoStatusBadge } from '../components';
import { RESIDUOS } from '../data';
import { exportCsv, logAudit } from '../utils';

export function ResiduosScreen({ state, dispatch }) {
  const [filter, setFilter] = useState('todos');
  const list = RESIDUOS.filter((r) => filter === 'todos' || r.status === filter);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Resíduos químicos</h1>
          <p className="page-sub">Rastreabilidade do berço ao destino · base PNRS Lei 12.305/2010 · {RESIDUOS.length} registros</p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-sm" onClick={() => {
            const rows = [['ID', 'Tipo', 'Gerador', 'Volume', 'Unid.', 'Status', 'Composição', 'Risco', 'MTR', 'Registrado']];
            list.forEach(r => rows.push([r.id, r.tipo, r.gerador, r.volume, r.unidade, r.status, r.composicao, r.risco, r.mtr || '', r.registrado]));
            exportCsv(rows, `residuos-${new Date().toISOString().slice(0,10)}.csv`);
            logAudit('waste.export', `Exportou lista de resíduos (${list.length} itens, filtro=${filter})`);
            dispatch({type: 'refresh'});
          }}><Icon name="download" size={13} /> Exportar lista</button>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => dispatch({ type: 'openModal', kind: 'novoResiduo' })}>
            <Icon name="plus" size={13} /> Registrar resíduo
          </button>
        </div>
      </div>

      <div className="card card-tight">
        <div className="toolbar">
          {[
          ['todos', 'Todos', RESIDUOS.length],
          ['aguardando-coleta', 'Aguardando coleta', RESIDUOS.filter((r) => r.status === 'aguardando-coleta').length],
          ['em-coleta', 'Em coleta', RESIDUOS.filter((r) => r.status === 'em-coleta').length],
          ['rotulagem', 'Rotulagem', RESIDUOS.filter((r) => r.status === 'rotulagem').length],
          ['destinado', 'Destinados', RESIDUOS.filter((r) => r.status === 'destinado').length]].
          map(([k, l, c]) =>
          <button type="button" key={k} className={`filter-pill ${filter === k ? 'active' : ''}`}
          onClick={() => setFilter(k)} style={{ cursor: 'pointer', background: 'none', border: 'none', font: 'inherit' }}>
              {l} <span className="mono small">{c}</span>
            </button>
          )}
          <div className="input" style={{ marginLeft: 'auto' }}>
            <Icon name="search" size={14} />
            <input aria-label="Buscar resíduo" placeholder="Buscar resíduo…" />
          </div>
        </div>
        <table className="tbl">
          <thead>
            <tr>
              <th>ID</th><th>Tipo</th><th>Composição</th><th>Gerador</th>
              <th className="right">Volume</th><th>Risco</th><th>Status</th>
              <th>Registrado</th><th>MTR</th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) =>
            <tr key={r.id} className={state.flashId === r.id ? 'flash selected' : ''}>
                <td className="num">{r.id}</td>
                <td>{r.tipo}</td>
                <td className="small muted">{r.composicao}</td>
                <td><Tag>{r.gerador}</Tag></td>
                <td className="num right">{r.volume} {r.unidade}</td>
                <td>{riscoBadge(r.risco)}</td>
                <td>{residuoStatusBadge(r.status)}</td>
                <td className="mono small muted">{r.registrado}</td>
                <td className="mono small">{r.mtr || <span className="muted">-</span>}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="grid-2" style={{ marginTop: 16 }}>
        <div className="card">
          <SectionTitle title="Hierarquia PNRS · este ano" sub="Distribuição por destinação" />
          <div className="card-body">
            <div className="bar-chart">
              {[
              ['Não geração / redução', 18, 'green'],
              ['Reutilização interna', 12, 'green'],
              ['Reciclagem', 26, ''],
              ['Tratamento (neutralização)', 22, 'amber'],
              ['Disposição final licenciada', 22, 'red']].
              map(([n, v, c]) =>
              <div className="bar-row" key={n}>
                  <div className="name">{n}</div>
                  <div className="bar-bg"><div className={`bar-fill ${c}`} style={{ width: `${v * 3}%` }} /></div>
                  <div className="val">{v}%</div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="card">
          <SectionTitle title="Próximas coletas agendadas" />
          <div style={{ padding: '4px 0' }}>
            {[
            ['EcoQuímica SA', '2025-11-26', '4 resíduos · 7,2 L', 'amber'],
            ['EcoLog Transportes', '2025-12-03', '6 resíduos · 18,4 L', 'gray'],
            ['EcoQuímica SA', '2025-12-10', 'A confirmar', 'gray']].
            map(([dest, data, det, k], i) =>
            <div key={`${dest}-${data}`} style={{ padding: '10px 14px', borderTop: i ? '1px solid var(--border)' : 0, display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 12.5 }}>{dest}</div>
                  <div className="small muted">{det}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="mono small">{data}</div>
                  <Badge kind={k}>{k === 'amber' ? 'em 3 dias' : 'agendada'}</Badge>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>);

}
