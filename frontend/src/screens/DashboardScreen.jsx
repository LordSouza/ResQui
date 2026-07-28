import { Icon, Tag, SectionTitle, riscoBadge } from '../components';
import { exportCsv, litrosEquivalentes } from '../utils';
import { useReagentes } from '../reagentes/useReagentes';
import { useResíduos } from '../residuos/useResíduos';
import { useMtrs } from '../mtrs/useMtrs';
import { useNotificacoes } from '../notificacoes/useNotificacoes';
import { useResiduosAnalytics } from '../residuos/useResiduosAnalytics';

export function DashboardScreen({ state, dispatch }) {
  const { data: totalData, isError: totalError, refetch: refetchTotal } = useReagentes({ pageSize: 1 });
  const { data: expirData, isError: expirError, refetch: refetchExpir } = useReagentes({ pageSize: 1, vencendo: true });
  const { data: residuosData = [] } = useResíduos();
  const { data: mtrsData = [] } = useMtrs();
  const { data: notifData = [] } = useNotificacoes();
  const { data: analytics } = useResiduosAnalytics({ meses: 6 });
  const geracaoMensal = analytics?.mensal ?? [];
  const geracaoPorLab = analytics?.porLab ?? [];
  const totalReagentes = totalData?.total;
  const expirando = expirData?.total;
  const aguardando = residuosData.filter(r => r.status === 'aguardando-coleta').length;
  const mtrPendentes = mtrsData.filter(m => m.status === 'pendente-sinir').length;
  const volumeAguardando = Math.round(
    residuosData.filter(r => r.status === 'aguardando-coleta')
      .reduce((s, r) => s + litrosEquivalentes(r.volume, r.unidade), 0)
  );

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">Visão consolidada · UNIFEI · IMC · Laboratórios de Química</p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-sm" onClick={() => {
            const rows = [
              ['Métrica', 'Valor'],
              ['Reagentes ativos', totalReagentes ?? 0],
              ['Resíduos aguardando coleta', aguardando],
              ['MTRs ativos', mtrsData.length],
              ['Alertas pendentes', notifData.filter(n => !n.lida).length],
              ['Lab com mais geração', geracaoPorLab.length > 0 ? geracaoPorLab[0].lab : '—'],
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
          <div className="value tnum">{aguardando}<span className="unit">/ {volumeAguardando} L</span></div>
        </div>
        <div className={`kpi ${mtrPendentes > 0 ? 'warn' : ''}`}>
          <div className="kpi-stripe"/>
          <div className="label">MTRs pendentes SINIR</div>
          <div className="value tnum">{mtrPendentes}<span className="unit">MTRs</span></div>
        </div>
      </div>

      <div className="detail-grid">
        <div className="col">
          {/* Geração de resíduos */}
          <div className="card">
            <SectionTitle title="Geração de resíduos por mês" sub="Litros equivalentes · 2025" right={<Tag>últimos 7 meses</Tag>}/>
            <div className="card-body">
              <div className="spark" style={{height: 80}}>
                {geracaoMensal.map((m, i) => {
                  const max = Math.max(...geracaoMensal.map(x => x.valor), 1);
                  const h = (m.valor / max) * 100;
                  return (
                    <div key={m.mes} style={{flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4}}>
                      <div className={`b ${i === geracaoMensal.length - 1 ? 'active' : ''}`}
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
                {(() => {
                  const CORES_LAB = ['accent', 'green', 'amber', 'red'];
                  const max = Math.max(...geracaoPorLab.map(x => x.valor), 1);
                  return geracaoPorLab.map((b, i) => (
                    <div className="bar-row" key={b.lab}>
                      <div className="name">{b.lab}</div>
                      <div className="bar-bg">
                        <div className={`bar-fill ${CORES_LAB[i % CORES_LAB.length]}`} style={{width: `${(b.valor / max) * 100}%`}}/>
                      </div>
                      <div className="val">{b.valor.toFixed(1)} L</div>
                    </div>
                  ));
                })()}
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
                {residuosData.filter(r => r.status === 'aguardando-coleta').slice(0, 5).map(r => (
                  <tr key={r.id} onClick={() => dispatch({type: 'nav', screen: 'residuos'})}>
                    <td className="num">{r.id}</td>
                    <td>{r.tipo}</td>
                    <td><Tag>{r.lab_id}</Tag></td>
                    <td className="num">{r.volume} {r.unidade}</td>
                    <td>{riscoBadge(r.risco)}</td>
                    <td className="mono small muted">{r.data_registro?.slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sidebar de notificações */}
        <div className="col">
          <div className="card">
            <SectionTitle title="Alertas ativos" sub={`${notifData.filter(n => !n.lida).length} pendentes`}
              right={<Icon name="bell" size={14}/>}/>
            <div style={{display: 'flex', flexDirection: 'column'}}>
              {notifData.filter(n => !n.lida).map((n, i, arr) => (
                <div key={n.id} style={{padding: '10px 14px', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 0, display: 'flex', gap: 10}}>
                  <div style={{width: 6, height: 6, borderRadius: '50%', background: n.severidade === 'red' ? 'var(--red)' : 'var(--amber)', marginTop: 6, flexShrink: 0}}/>
                  <div style={{flex: 1}}>
                    <div style={{fontSize: 12.5, lineHeight: 1.35}}>{n.mensagem}</div>
                    <div className="mono small muted" style={{marginTop: 2}}>{n.criada_em?.slice(0, 10)}</div>
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
