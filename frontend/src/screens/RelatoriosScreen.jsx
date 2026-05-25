import { Icon, Badge, SectionTitle } from '../components';
import { logAudit } from '../utils';

export function RelatoriosScreen({ state, dispatch }) {
  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Relatórios e PGRS</h1>
          <p className="page-sub">Plano de Gerenciamento de Resíduos Sólidos · documentos consolidados para órgãos fiscalizadores</p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-sm" onClick={() => dispatch({ type: 'openModal', kind: 'configurarPgrs' })}><Icon name="settings" size={13} /> Configurar PGRS</button>
        </div>
      </div>

      <div className="grid-3" style={{ marginBottom: 16 }}>
        {[
        ['PGRS Anual 2025', 'Plano de Gerenciamento consolidado', 'PDF · 38 pág.', 'green', 'Atualizado 19/nov'],
        ['Inventário de reagentes', 'Listagem para PF/Exército (controlados)', 'CSV + PDF', 'blue', 'Atualizado hoje'],
        ['Mapa de risco · químico', 'Por laboratório e por classe', 'PDF · 12 pág.', 'amber', '6 itens críticos'],
        ['Declaração SINIR trimestral', '3º trimestre 2025', 'XML / PDF', 'green', 'Aceito em 14/out'],
        ['Resíduos por código IBAMA', 'Agregados 2025', 'CSV', 'gray', '—'],
        ['Indicadores de geração', 'L equivalentes por lab', 'PDF · 6 pág.', 'gray', '—']].
        map(([t, s, fmt, k, foot]) =>
        <div className="card" key={t}>
            <div className="card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <Icon name="file_chart" size={20} />
                <Badge kind={k}>{fmt}</Badge>
              </div>
              <div style={{ fontWeight: 600, marginBottom: 2 }}>{t}</div>
              <div className="small muted" style={{ marginBottom: 10 }}>{s}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 8 }}>
                <span className="mono small muted">{foot}</span>
                <button type="button" className="btn btn-sm" onClick={() => {
                  logAudit('report.generate', `Gerou relatório: ${t}`, 'low');
                  alert(`Relatório "${t}" gerado.\n\nO download começará em instantes.`);
                  dispatch({type: 'refresh'});
                }}><Icon name="download" size={11} /> Gerar</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <SectionTitle title="PGRS · estrutura"
        sub="Itens obrigatórios conforme art. 21 da Lei 12.305/2010" right={<Badge kind="green">95% completo</Badge>} />
        <div style={{ padding: 0 }}>
          {[
          ['I — Descrição do empreendimento ou atividade', 'completo'],
          ['II — Diagnóstico dos resíduos sólidos gerados', 'completo'],
          ['III — Observações sobre a hierarquia de gestão', 'completo'],
          ['IV — Identificação das soluções compartilhadas', 'completo'],
          ['V — Ações preventivas e corretivas', 'parcial'],
          ['VI — Metas e procedimentos relacionados', 'completo'],
          ['VII — Periodicidade da revisão (anual)', 'completo']].
          map(([t, st], i) =>
          <div key={t} style={{ padding: '10px 14px', borderTop: i ? '1px solid var(--border)' : 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12.5 }}>{t}</span>
              {st === 'completo' ?
            <Badge kind="green" dot>Completo</Badge> :
            <Badge kind="amber" dot>Parcial</Badge>}
            </div>
          )}
        </div>
      </div>
    </>);

}
