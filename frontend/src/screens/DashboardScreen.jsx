import { Icon, Tag, SectionTitle, riscoBadge } from '../components';
import { quantidadesResiduos, formatarQuantidade, completarMeses } from '../utils';
import { useReagentes } from '../reagentes/useReagentes';
import { useResíduos } from '../residuos/useResíduos';
import { useMtrs } from '../mtrs/useMtrs';
import { useNotificacoes } from '../notificacoes/useNotificacoes';
import { useResiduosAnalytics } from '../residuos/useResiduosAnalytics';
import { useIdentificacaoPgrs } from '../pgrs/useIdentificacaoPgrs';
import { usePode } from '../auth/permissoes';

export function DashboardScreen({ state, dispatch }) {
  const { data: totalData, isError: totalError, refetch: refetchTotal } = useReagentes({ pageSize: 1 });
  const { data: expirData, isError: expirError, refetch: refetchExpir } = useReagentes({ pageSize: 1, vencendo: true });
  const { data: residuosData = [] } = useResíduos();
  const { data: mtrsData = [] } = useMtrs();
  const { data: notifData = [] } = useNotificacoes();
  const { data: analytics } = useResiduosAnalytics({ meses: 6 });
  const { data: identificacao } = useIdentificacaoPgrs();
  const geracaoMensal = completarMeses(analytics?.mensal ?? [], 7);
  const geracaoPorLab = analytics?.porLab ?? [];
  const totalReagentes = totalData?.total;
  const expirando = expirData?.total;
  const aguardando = residuosData.filter(r => r.status === 'aguardando-coleta').length;
  const quantidadeAguardando = quantidadesResiduos(
    residuosData.filter(r => r.status === 'aguardando-coleta')
  );

  const podeAprovarDescarte = usePode('Aprovador');
  const podeOperarColeta = usePode('Operacao');
  const solicitados = residuosData.filter(r => r.status === 'solicitado').length;
  const manifestosPendentes = mtrsData.filter(m => !m.data_destinacao).length;

  const pendencias = [
    podeAprovarDescarte && solicitados > 0 && {
      chave: 'aprovar', texto: `${solicitados} solicitaç${solicitados > 1 ? 'ões' : 'ão'} de descarte aguardando aprovação`,
      acao: () => dispatch({ type: 'nav', screen: 'residuos', residuosStatus: 'solicitado' }),
    },
    podeOperarColeta && aguardando > 0 && {
      chave: 'coleta', texto: `${aguardando} resíduo${aguardando > 1 ? 's' : ''} aguardando coleta`,
      acao: () => dispatch({ type: 'nav', screen: 'residuos', residuosStatus: 'aguardando-coleta' }),
    },
    podeOperarColeta && manifestosPendentes > 0 && {
      chave: 'destinar', texto: `${manifestosPendentes} manifesto${manifestosPendentes > 1 ? 's' : ''} sem destinação confirmada`,
      acao: () => dispatch({ type: 'nav', screen: 'mtr' }),
    },
    expirando > 0 && {
      chave: 'vencendo', texto: `${expirando} reagente${expirando > 1 ? 's' : ''} vencendo em até 90 dias`,
      acao: () => dispatch({ type: 'nav', screen: 'inventario', inventarioVencendo: true }),
    },
  ].filter(Boolean);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Início</h1>
          <p className="page-sub">{[identificacao?.razaoSocial, identificacao?.unidade].filter(Boolean).join(' · ') || 'Visão geral do laboratório'}</p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-sm" onClick={() => dispatch({type: 'refresh'})}><Icon name="refresh" size={13}/> Atualizar</button>
        </div>
      </div>

      {(totalError || expirError) && (
        <div className="page-error">
          Erro ao carregar dados de reagentes.{' '}
          <button type="button" onClick={() => { refetchTotal(); refetchExpir(); }}>Tentar novamente</button>
        </div>
      )}

      {pendencias.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <SectionTitle title="Precisa de você" sub={`${pendencias.length} pendência${pendencias.length > 1 ? 's' : ''}`}/>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {pendencias.map(p => (
              <button type="button" key={p.chave} className="pendencia-row" onClick={p.acao}>
                <span>{p.texto}</span>
                <Icon name="chevron_right" size={13}/>
              </button>
            ))}
          </div>
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
          <div className="value tnum">{aguardando}<span className="unit">/ {formatarQuantidade(quantidadeAguardando)}</span></div>
        </div>
      </div>

      <div className="detail-grid">
        <div className="col">
          {/* Geração de resíduos */}
          <div className="card">
            <SectionTitle title="Geração de resíduos por mês" sub="cada série na própria escala" right={<Tag>últimos 7 meses</Tag>}/>
            <div className="card-body">
              <div className="spark-legenda">
                <span><i className="b litros"/>Líquidos (L)</span>
                <span><i className="b quilos"/>Sólidos (kg)</span>
              </div>
              <div className="spark" style={{height: 100}}>
                {geracaoMensal.map((m, i) => {
                  const maxLitros = Math.max(...geracaoMensal.map(x => x.litros), 1);
                  const maxQuilos = Math.max(...geracaoMensal.map(x => x.quilos), 1);
                  const atual = i === geracaoMensal.length - 1;
                  return (
                    <div key={m.mes} style={{flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4}}>
                      <div style={{height: 56, width: '70%', display: 'flex', alignItems: 'flex-end', gap: 3}}>
                        <div className="b litros" style={{height: `${(m.litros / maxLitros) * 100}%`, flex: 1}}/>
                        <div className="b quilos" style={{height: `${(m.quilos / maxQuilos) * 100}%`, flex: 1}}/>
                      </div>
                      <div className="mono" style={{fontSize: 12, color: atual ? 'var(--text)' : 'var(--text-3)', fontWeight: atual ? 600 : 400}}>{m.mes}</div>
                      <div className="mono tnum" style={{fontSize: 11}}>{m.litros.toFixed(1)}L</div>
                      <div className="mono tnum" style={{fontSize: 11, color: 'var(--text-3)'}}>{m.quilos.toFixed(1)}kg</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Geração por laboratório */}
          <div className="card">
            <SectionTitle title="Geração por laboratório · este mês" sub="líquidos (L) · sólidos (kg)"/>
            <div className="card-body">
              <div className="bar-chart">
                {(() => {
                  const CORES_LAB = ['accent', 'green', 'amber', 'red'];
                  const max = Math.max(...geracaoPorLab.map(x => x.litros), 1);
                  return geracaoPorLab.map((b, i) => (
                    <div className="bar-row" key={b.lab}>
                      <div className="name">{b.lab}</div>
                      <div className="bar-bg">
                        <div className={`bar-fill ${CORES_LAB[i % CORES_LAB.length]}`} style={{width: `${(b.litros / max) * 100}%`}}/>
                      </div>
                      <div className="val">{formatarQuantidade(b, 1)}</div>
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
                  <tr key={r.id} tabIndex={0}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); dispatch({type: 'nav', screen: 'residuos'}); } }}
                    onClick={() => dispatch({type: 'nav', screen: 'residuos'})}>
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
                <Icon name="truck" size={13}/> Manifestos
              </button>
              <button type="button" className="btn btn-sm" onClick={() => dispatch({type: 'openChat'})}>
                <Icon name="sparkle" size={13}/> Pedir ao assistente
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
