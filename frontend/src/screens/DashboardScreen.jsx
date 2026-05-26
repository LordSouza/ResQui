import { Icon, Tag, SectionTitle, riscoBadge } from '../components';
import { RESIDUOS, MTRS, NOTIFICACOES, GERACAO_MENSAL, GERACAO_POR_LAB } from '../data';
import { exportCsv } from '../utils';
import { useReagentes } from '../reagentes/useReagentes';

export function DashboardScreen({ state, dispatch }) {
  const residuos = RESIDUOS;
  const { data: totalData, isError: totalError, refetch: refetchTotal } = useReagentes({ pageSize: 1 });
  const { data: expirData, isError: expirError, refetch: refetchExpir } = useReagentes({ pageSize: 1, vencendo: true });
  const totalReagentes = totalData?.total;
  const expirando = expirData?.total;
  const aguardando = residuos.filter(r => r.status === 'aguardando-coleta').length;
  const mtrPendentes = MTRS.filter(m => m.status === 'pendente-sinir').length;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">Visão consolidada · UNIFEI · IMC · Laboratórios de Química · semana de 17–23/nov/2025</p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-sm" onClick={() => {
            const rows = [
              ['Métrica', 'Valor'],
              ['Reagentes ativos', totalReagentes ?? 0],
              ['Resíduos aguardando coleta', RESIDUOS.filter(r => r.status === 'aguardando-coleta').length],
              ['MTRs ativos', MTRS.length],
              ['Alertas pendentes', NOTIFICACOES.filter(n => !n.lida).length],
              ['Lab com mais geração', GERACAO_POR_LAB.reduce((a,b) => a.valor > b.valor ? a : b).lab],
              ['Gerado em', new Date().toLocaleString('pt-BR')],
            ];
            exportCsv(rows, `dashboard-${new Date().toISOString().slice(0,10)}.csv`);
            dispatch({type: 'refresh'});
          }}><Icon name="download" size={13}/> Exportar relatório</button>
          <button type="button" className="btn btn-sm" onClick={() => dispatch({type: 'refresh'})}><Icon name="refresh" size={13}/> Atualizar</button>
        </div>
      </div>

      {(totalError || expirError) && (
        <div className="page-error">
          Erro ao carregar dados de reagentes.{' '}
          <button type="button" onClick={() => { refetchTotal(); refetchExpir(); }}>Tentar novamente</button>
        </div>
      )}

      <div className="kpi-grid">
        <div className="kpi">
          <div className="kpi-stripe"/>
          <div className="label">Itens em inventário</div>
          <div className="value tnum">{totalReagentes ?? '…'}<span className="unit">itens</span></div>
          <div className="delta up">▲ 12 nos últimos 7d</div>
        </div>
        <div className={`kpi ${expirando > 0 ? 'warn' : ''}`}>
          <div className="kpi-stripe"/>
          <div className="label">Vencimento ≤ 90 dias</div>
          <div className="value tnum">{expirando ?? '…'}<span className="unit">reagentes</span></div>
          <div className="delta">requer ação</div>
        </div>
        <div className={`kpi ${aguardando > 4 ? 'warn' : ''}`}>
          <div className="kpi-stripe"/>
          <div className="label">Resíduos aguardando coleta</div>
          <div className="value tnum">{aguardando}<span className="unit">/ 56 L</span></div>
          <div className="delta down">há até 8 dias parados</div>
        </div>
        <div className="kpi ok">
          <div className="kpi-stripe"/>
          <div className="label">Conformidade SINIR (90d)</div>
          <div className="value tnum">98<span className="unit">%</span></div>
          <div className="delta up">▲ 4 p.p. vs trimestre ant.</div>
        </div>
      </div>

      <div className="detail-grid">
        <div className="col">
          {/* Geração de resíduos */}
          <div className="card">
            <SectionTitle title="Geração de resíduos por mês" sub="Litros equivalentes · 2025" right={<Tag>últimos 7 meses</Tag>}/>
            <div className="card-body">
              <div className="spark" style={{height: 80}}>
                {GERACAO_MENSAL.map((m, i) => {
                  const max = Math.max(...GERACAO_MENSAL.map(x => x.valor));
                  const h = (m.valor / max) * 100;
                  return (
                    <div key={m.mes} style={{flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4}}>
                      <div className={`b ${i === GERACAO_MENSAL.length - 1 ? 'active' : ''}`}
                        style={{height: `${h}%`, width: '70%'}}/>
                      <div className="mono" style={{fontSize: 12, color: 'var(--text-3)'}}>{m.mes}</div>
                      <div className="mono tnum" style={{fontSize: 12}}>{m.valor}L</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Geração por laboratório */}
          <div className="card">
            <SectionTitle title="Geração por laboratório · este mês" sub="L equivalentes"/>
            <div className="card-body">
              <div className="bar-chart">
                {GERACAO_POR_LAB.map((b, i) => {
                  const max = Math.max(...GERACAO_POR_LAB.map(x => x.valor));
                  return (
                    <div className="bar-row" key={b.lab}>
                      <div className="name">{b.lab}</div>
                      <div className="bar-bg">
                        <div className={`bar-fill ${b.cor}`} style={{width: `${(b.valor / max) * 100}%`}}/>
                      </div>
                      <div className="val">{b.valor.toFixed(1)} L</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Resíduos recentes */}
          <div className="card card-tight">
            <SectionTitle title="Resíduos aguardando coleta" sub={`${aguardando} registros · ordenado por antiguidade`}
              right={<button type="button" className="btn btn-sm" onClick={() => dispatch({type: 'nav', screen: 'residuos'})}>Ver todos <Icon name="chevron_right" size={12}/></button>}/>
            <table className="tbl">
              <thead><tr><th>ID</th><th>Tipo</th><th>Gerador</th><th>Volume</th><th>Risco</th><th>Registrado</th></tr></thead>
              <tbody>
                {RESIDUOS.filter(r => r.status === 'aguardando-coleta').slice(0, 5).map(r => (
                  <tr key={r.id} onClick={() => dispatch({type: 'nav', screen: 'residuos'})}>
                    <td className="num">{r.id}</td>
                    <td>{r.tipo}</td>
                    <td><Tag>{r.gerador}</Tag></td>
                    <td className="num">{r.volume} {r.unidade}</td>
                    <td>{riscoBadge(r.risco)}</td>
                    <td className="mono small muted">{r.registrado}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sidebar de notificações */}
        <div className="col">
          <div className="card">
            <SectionTitle title="Alertas ativos" sub={`${NOTIFICACOES.length} pendentes`}
              right={<Icon name="bell" size={14}/>}/>
            <div style={{display: 'flex', flexDirection: 'column'}}>
              {NOTIFICACOES.map((n, i) => (
                <div key={n.titulo} style={{padding: '10px 14px', borderBottom: i < NOTIFICACOES.length - 1 ? '1px solid var(--border)' : 0, display: 'flex', gap: 10}}>
                  <div style={{width: 6, height: 6, borderRadius: '50%', background: n.sev === 'red' ? 'var(--red)' : 'var(--amber)', marginTop: 6, flexShrink: 0}}/>
                  <div style={{flex: 1}}>
                    <div style={{fontSize: 12.5, lineHeight: 1.35}}>{n.titulo}</div>
                    <div className="mono small muted" style={{marginTop: 2}}>{n.t}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <SectionTitle title="Conformidade" sub="Plano de Gerenciamento de Resíduos"/>
            <div className="card-body">
              {[
                ['Rotulagem GHS (ABNT NBR 14725)', 96, 'green'],
                ['Segregação na fonte', 88, 'green'],
                ['Documentação MTR/SINIR', 92, 'green'],
                ['Treinamento de pessoal', 71, 'amber'],
                ['Inventário atualizado', 99, 'green'],
              ].map(([label, val, cor]) => (
                <div key={label} style={{marginBottom: 10}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3}}>
                    <span>{label}</span>
                    <span className="mono tnum">{val}%</span>
                  </div>
                  <div className="bar-bg" style={{height: 6, background: 'var(--surface-2)', borderRadius: 3}}>
                    <div style={{width: `${val}%`, height: '100%', background: `var(--${cor})`, borderRadius: 3}}/>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <SectionTitle title="Atalhos"/>
            <div style={{padding: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8}}>
              <button type="button" className="btn btn-sm" onClick={() => dispatch({type: 'nav', screen: 'compat'})}>
                <Icon name="shield" size={13}/> Verif. mistura
              </button>
              <button type="button" className="btn btn-sm" onClick={() => dispatch({type: 'nav', screen: 'residuos'})}>
                <Icon name="trash" size={13}/> Reg. resíduo
              </button>
              <button type="button" className="btn btn-sm" onClick={() => dispatch({type: 'nav', screen: 'mtr'})}>
                <Icon name="truck" size={13}/> Novo MTR
              </button>
              <button type="button" className="btn btn-sm" onClick={() => dispatch({type: 'openChat'})}>
                <Icon name="sparkle" size={13}/> Pedir ao MCP
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
