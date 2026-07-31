import { useState, useMemo, useReducer } from 'react';
import { Icon, Badge, SectionTitle } from '../components';
import Modal from '../forms/Modal';
import { exportCsv } from '../utils';
import { useAuditoria } from '../auditoria/useAuditoria';

function FiltrosAvancadosAuditoria({ adv, setAdv, onClose, allData }) {
  const [draft, setDraft] = useState(() => adv);

  const usuariosOpts = useMemo(() => [...new Set(allData.map(a => a.who))].toSorted(), [allData]);
  const locaisOpts = useMemo(() => [...new Set(allData.map(a => a.where))].filter(w => w && w !== '-').toSorted(), [allData]);
  const categoriasOpts = [
    ['mtr.', 'MTR'],
    ['user.', 'Usuários e sessões'],
    ['compat.', 'Compatibilidade química'],
    ['item.', 'Movimentação de inventário'],
    ['waste.', 'Resíduos'],
    ['report.', 'Relatórios'],
    ['audit.', 'Auditoria (exports etc)'],
    ['support.', 'Chamados de suporte'],
    ['lab.', 'Laboratórios'],
    ['alert.', 'Alertas do sistema'],
    ['label.', 'Rótulos GHS'],
    ['pgrs.', 'PGRS'],
  ];

  const toggle = (key, val) => setDraft(d => ({
    ...d,
    [key]: d[key].includes(val) ? d[key].filter(x => x !== val) : [...d[key], val],
  }));

  const aplicar = () => { setAdv(draft); onClose(); };
  const limpar = () => setDraft({ dateFrom: '', dateTo: '', users: [], locations: [], risks: [], categories: [] });

  const draftCount = (draft.dateFrom ? 1 : 0) + (draft.dateTo ? 1 : 0)
    + (draft.users.length ? 1 : 0) + (draft.locations.length ? 1 : 0)
    + (draft.risks.length ? 1 : 0) + (draft.categories.length ? 1 : 0);

  return (
    <Modal title="Filtros avançados" sub="Cruze múltiplas dimensões do log de auditoria"
      onClose={onClose} width={720}
      footer={<>
        <span className="small muted" style={{flex: 1, fontFamily: 'var(--mono)'}}>
          {draftCount > 0 ? `${draftCount} filtro${draftCount > 1 ? 's' : ''} ativo${draftCount > 1 ? 's' : ''}` : 'Nenhum filtro avançado ativo'}
        </span>
        <button type="button" className="btn btn-sm" onClick={limpar}>Limpar tudo</button>
        <button type="button" className="btn btn-sm" onClick={onClose}>Cancelar</button>
        <button type="button" className="btn btn-primary btn-sm" onClick={aplicar}><Icon name="check" size={12}/> Aplicar</button>
      </>}>
      <div style={faqGrid}>
        <div>
          <div style={faqLabel}>Período customizado</div>
          <div className="form-row" style={{margin: 0}}>
            <div className="field"><label htmlFor="adv-date-from">De</label>
              <input id="adv-date-from" aria-label="Data inicial do período" type="date" value={draft.dateFrom} onChange={e => setDraft(d => ({...d, dateFrom: e.target.value}))} style={{fontFamily: 'var(--mono)'}}/></div>
            <div className="field"><label htmlFor="adv-date-to">Até</label>
              <input id="adv-date-to" aria-label="Data final do período" type="date" value={draft.dateTo} onChange={e => setDraft(d => ({...d, dateTo: e.target.value}))} style={{fontFamily: 'var(--mono)'}}/></div>
          </div>
          <div className="small muted" style={{marginTop: 4, fontSize: 12}}>Sobrepõe o filtro de período da toolbar.</div>
        </div>

        <div>
          <div style={faqLabel}>Nível de risco</div>
          <div style={{display: 'flex', flexDirection: 'column', gap: 4}}>
            {[
              ['low', 'Baixo (informativo)', 'var(--text-3)'],
              ['med', 'Médio (atenção)', 'var(--amber)'],
              ['high', 'Alto (crítico)', 'var(--red)'],
            ].map(([k, label, color]) => (
              <label key={k} style={faqCheck}>
                <input type="checkbox" aria-label={label} checked={draft.risks.includes(k)} onChange={() => toggle('risks', k)}/>
                <span style={{color, fontWeight: 500}}>{label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div style={{marginTop: 16}}>
        <div style={faqLabel}>Usuários ({draft.users.length || 'todos'})</div>
        <div style={faqChips}>
          {usuariosOpts.map(u => {
            const ativo = draft.users.includes(u);
            return (
              <button type="button" key={u} aria-label={`Filtrar por usuário ${u}`} onClick={() => toggle('users', u)} style={{...faqChip, ...(ativo ? faqChipOn : {})}}>
                {u === 'sistema' && <Icon name="bot" size={10}/>}
                {u}
              </button>
            );
          })}
        </div>
      </div>

      {locaisOpts.length > 0 && (
        <div style={{marginTop: 16}}>
          <div style={faqLabel}>Locais / laboratórios ({draft.locations.length || 'todos'})</div>
          <div style={faqChips}>
            {locaisOpts.map(l => {
              const ativo = draft.locations.includes(l);
              return (
                <button type="button" key={l} aria-label={`Filtrar por local ${l}`} onClick={() => toggle('locations', l)} style={{...faqChip, ...(ativo ? faqChipOn : {}), fontFamily: 'var(--mono)'}}>
                  {l}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div style={{marginTop: 16}}>
        <div style={faqLabel}>Categorias de evento ({draft.categories.length || 'todas'})</div>
        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4}}>
          {categoriasOpts.map(([prefix, label]) => (
            <label key={prefix} style={faqCheck}>
              <input type="checkbox" aria-label={label} checked={draft.categories.includes(prefix)} onChange={() => toggle('categories', prefix)}/>
              <span>{label} <span className="muted mono" style={{fontSize: 12}}>({prefix}*)</span></span>
            </label>
          ))}
        </div>
      </div>
    </Modal>
  );
}

const faqGrid = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 };
const faqLabel = { fontSize: 12, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', marginBottom: 8 };
const faqCheck = { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, padding: '4px 0', cursor: 'pointer' };
const faqChips = { display: 'flex', flexWrap: 'wrap', gap: 6 };
const faqChip = {
  padding: '4px 10px', border: '1px solid var(--border)', background: '#fff',
  borderRadius: 14, fontSize: 12, cursor: 'pointer', display: 'inline-flex',
  alignItems: 'center', gap: 4, color: 'var(--text-2)',
};
const faqChipOn = {
  borderColor: 'var(--accent)', background: 'var(--accent-soft)', color: 'var(--accent)',
  fontWeight: 600,
};

const AUDIT_INITIAL = {
  query: '',
  actionFilter: 'todas',
  range: 'todos',
  advOpen: false,
  adv: { dateFrom: '', dateTo: '', users: [], locations: [], risks: [], categories: [] },
};

function auditReducer(s, action) {
  switch (action.type) {
    case 'setQuery': return { ...s, query: action.value };
    case 'setActionFilter': return { ...s, actionFilter: action.value };
    case 'setRange': return { ...s, range: action.value };
    case 'openAdv': return { ...s, advOpen: true };
    case 'closeAdv': return { ...s, advOpen: false };
    case 'setAdv': return { ...s, adv: action.value, advOpen: false };
    case 'reset': return AUDIT_INITIAL;
    default: return s;
  }
}

export function AuditoriaScreen({ state, dispatch }) {
  const [filters, dispatchFilters] = useReducer(auditReducer, AUDIT_INITIAL);
  const { query, actionFilter, range, advOpen, adv } = filters;

  const apiFiltro = {
    ...(adv.users[0] ? { who: adv.users[0] } : {}),
    ...(adv.categories[0] ? { what: adv.categories[0] } : {}),
    ...(adv.locations[0] ? { where: adv.locations[0] } : {}),
    ...(adv.risks[0] ? { risk: adv.risks[0] } : {}),
    ...(adv.dateFrom ? { from: adv.dateFrom } : {}),
    ...(adv.dateTo ? { to: adv.dateTo } : {}),
  };

  const { data: rawData = [], isPending, isError, refetch } = useAuditoria(apiFiltro);

  // Ações únicas (ordenadas) da base
  const actionOptions = useMemo(() => {
    const set = new Set(rawData.map((a) => a.what));
    return [...set].toSorted();
  }, [rawData]);

  // Âncora de tempo = timestamp mais recente da base
  const anchor = useMemo(() => {
    const ts = rawData.map((a) => new Date(a.ts).getTime());
    return ts.length ? Math.max(...ts) : Date.now();
  }, [rawData]);
  const rangeMs = { '24h': 24 * 3600e3, '7d': 7 * 24 * 3600e3, '30d': 30 * 24 * 3600e3, 'todos': Infinity }[range];

  const advActiveCount = (adv.dateFrom ? 1 : 0) + (adv.dateTo ? 1 : 0)
    + (adv.users.length ? 1 : 0) + (adv.locations.length ? 1 : 0)
    + (adv.risks.length ? 1 : 0) + (adv.categories.length ? 1 : 0);

  const filtered = rawData.filter((a) => {
    if (actionFilter !== 'todas' && a.what !== actionFilter) return false;
    const ms = new Date(a.ts).getTime();
    if (anchor - ms > rangeMs) return false;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      const hay = `${a.who} ${a.what} ${a.detail} ${a.where}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    // Filtros avançados
    if (adv.dateFrom) {
      const from = new Date(adv.dateFrom + 'T00:00:00Z').getTime();
      if (ms < from) return false;
    }
    if (adv.dateTo) {
      const to = new Date(adv.dateTo + 'T23:59:59Z').getTime();
      if (ms > to) return false;
    }
    if (adv.users.length && !adv.users.includes(a.who)) return false;
    if (adv.locations.length && !adv.locations.includes(a.where)) return false;
    if (adv.risks.length && !adv.risks.includes(a.risk)) return false;
    if (adv.categories.length) {
      const matched = adv.categories.some(prefix => a.what.startsWith(prefix));
      if (!matched) return false;
    }
    return true;
  });

  const exportDate = useMemo(() => new Date(), []);

  if (isPending) return <div className="page-loading"><Icon name="refresh" size={16}/> Carregando...</div>;
  if (isError) return <div className="page-error">Erro ao carregar dados. <button onClick={refetch}>Tentar novamente</button></div>;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Log de auditoria</h1>
          <p className="page-sub">Quem · Quando · O quê · Onde: registro imutável de todas as movimentações do sistema</p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-sm" onClick={() => {
            const rows = [['Timestamp', 'Usuário', 'Ação', 'Local', 'Detalhe', 'Risco']];
            filtered.forEach(a => rows.push([a.ts, a.who, a.what, a.where, a.detail, a.risk]));
            exportCsv(rows, `auditoria-${exportDate.toISOString().slice(0,10)}.csv`);
            dispatch({type: 'refresh'});
          }}><Icon name="download" size={13} /> Exportar CSV</button>
          <button type="button" className="btn btn-sm" onClick={() => dispatchFilters({ type: 'openAdv' })}>
            <Icon name="filter" size={13} /> Filtros avançados
            {advActiveCount > 0 && <span className="audit-adv-badge">{advActiveCount}</span>}
          </button>
        </div>
      </div>

      <div className="card card-tight">
        <div className="toolbar">
          <div className="input">
            <Icon name="search" size={14} />
            <input aria-label="Buscar no log de auditoria" placeholder="Buscar por usuário, ação ou ID…" value={query} onChange={(e) => dispatchFilters({ type: 'setQuery', value: e.target.value })} />
          </div>
          <select aria-label="Filtrar por ação" value={actionFilter} onChange={(e) => dispatchFilters({ type: 'setActionFilter', value: e.target.value })}>
            <option value="todas">Todas as ações</option>
            {actionOptions.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <select aria-label="Filtrar por período" value={range} onChange={(e) => dispatchFilters({ type: 'setRange', value: e.target.value })}>
            <option value="24h">Últimas 24h</option>
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="todos">Todos os períodos</option>
          </select>
          <span className="filter-pill active">{filtered.length} de {rawData.length} eventos</span>
          {(query || actionFilter !== 'todas' || range !== 'todos' || advActiveCount > 0) &&
          <button type="button" className="btn btn-sm" onClick={() => dispatchFilters({ type: 'reset' })}>
              <Icon name="close" size={12} /> Limpar
            </button>
          }
        </div>
        <div className="audit-col-header">
          <span>Timestamp</span>
          <span>Usuário</span>
          <span>Ação</span>
          <span>Detalhe</span>
          <span>Local</span>
        </div>
        {filtered.length === 0 ?
        <div className="audit-empty">
            Nenhum evento encontrado com os filtros atuais.
          </div> :
        filtered.map((a) =>
        <div key={`${a.ts}|${a.who}|${a.what}`} className="audit-row" style={a.risk === 'high' ? { background: 'var(--red-soft)' } : a.risk === 'med' ? { background: 'var(--amber-soft)' } : {}}>
            <span className="ts">{a.ts}</span>
            <span className="who">
              {a.who === 'sistema' ? <Badge kind="blue"><Icon name="bot" size={10} /> sistema</Badge> : a.who}
            </span>
            <span className="what">{a.what}</span>
            <span>{a.detail}</span>
            <span className="mono small muted">{a.where}</span>
          </div>
        )}
      </div>

      {advOpen && <FiltrosAvancadosAuditoria adv={adv} setAdv={(value) => dispatchFilters({ type: 'setAdv', value })} onClose={() => dispatchFilters({ type: 'closeAdv' })} allData={rawData}/>}
    </>);

}
