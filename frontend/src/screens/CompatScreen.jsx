import { useMemo, Fragment } from 'react';
import { Icon, SectionTitle, Picto } from '../components';
import { REATIVIDADE_CLASSES } from '../data';
import { useCompatMatriz } from '../compat/useCompatMatriz';
import { useCompatOverrides } from '../compat/useCompatOverrides';
import { useToast } from '../components/ToastContext';
import { useReagentes } from '../reagentes/useReagentes';
import { useReagente } from '../reagentes/useReagente';
import { exportCsv } from '../utils';

export function CompatScreen({ state, dispatch }) {
  const { data: listData, isPending: listPending, isError: listError, refetch: refetchList } = useReagentes({ pageSize: 200 });
  const allReagentes = listData?.items ?? [];

  const a = state.compatA || allReagentes[0]?.id || '';
  const b = state.compatB || allReagentes[1]?.id || '';

  const { data: ra } = useReagente(a || null);
  const { data: rb } = useReagente(b || null);

  const { data: matrizData, isPending: matrixPending, isError: matrixError, refetch: refetchMatrix } = useCompatMatriz();
  const matrix = matrizData?.matrix;
  const fonte = matrizData?.fonte;
  const { data: overrides = [] } = useCompatOverrides();
  const { addToast } = useToast();
  const overrideSet = new Set(overrides.map(o => `${o.classeA}-${o.classeB}`));

  const score = ra && rb && matrix ? (matrix[ra.classe]?.[rb.classe - 1] ?? 0) : 0;
  const kind = score === 3 ? 'danger' : score === 2 ? 'danger' : score === 1 ? 'warn' : 'ok';
  const title = score === 0 ? 'Compatíveis · sem restrição'
              : score === 1 ? 'Cautela: armazenar separados'
              : score === 2 ? 'Perigo: não armazenar próximos'
              : 'Proibido: reação violenta esperada';

  // Build reduced matrix from unique classes present
  const classesPresentes = [...new Set(allReagentes.map(r => r.classe))].toSorted((x, y) => x - y);
  const exportDate = useMemo(() => new Date(), []);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Motor de compatibilidade química</h1>
          <p className="page-sub">Verifica reações de risco entre pares antes do armazenamento, manuseio ou descarte conjunto. Regras institucionais só se aplicam quando um Gestor cadastra uma exceção na matriz.</p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-sm" onClick={() => {
            const header = ['Classe', ...classesPresentes.map(c => `Classe ${c}`)];
            const rows = [header];
            classesPresentes.forEach(ax => {
              rows.push([`${ax}. ${REATIVIDADE_CLASSES[ax]}`,
                ...classesPresentes.map(bx => matrix?.[ax]?.[bx - 1] ?? 0)]);
            });
            rows.push([]);
            rows.push(['Legenda', '0 = compatível', '1 = cautela', '2 = perigo', '3 = proibido']);
            rows.push([]);
            rows.push(['Fonte', fonte?.fonte ?? '']);
            rows.push(['Referência', fonte?.referencia ?? '']);
            rows.push(['URL', fonte?.url ?? '']);
            rows.push(['Detalhamento', fonte?.detalhamento ?? '']);
            rows.push(['Revisado em', fonte?.revisadoEm ?? '']);
            exportCsv(rows, `matriz-compatibilidade-${exportDate.toISOString().slice(0,10)}.csv`);
            dispatch({type: 'refresh'});
          }}><Icon name="download" size={13}/> Exportar matriz</button>
          <button type="button" className="btn btn-sm" onClick={() => dispatch({type: 'openModal', kind: 'editarRegrasCompat'})}><Icon name="settings" size={13}/> Editar regras</button>
        </div>
      </div>

      {listError && (
        <div className="page-error">
          Erro ao carregar reagentes.{' '}
          <button type="button" onClick={refetchList}>Tentar novamente</button>
        </div>
      )}
      {matrixPending && <div className="page-loading"><Icon name="refresh" size={16}/> Carregando matriz de compatibilidade...</div>}
      {matrixError && <div className="page-error">Erro ao carregar matriz. <button type="button" onClick={refetchMatrix}>Tentar novamente</button></div>}

      <div className="grid-2" style={{marginBottom: 16}}>
        <div className="card">
          <SectionTitle title="Verificar par" sub="Selecione dois itens do inventário"/>
          <div className="card-body">
            <div className="form-row">
              <div className="field">
                <label htmlFor="compat-select-a">Substância A</label>
                <select id="compat-select-a" value={a} disabled={listPending} onChange={e => dispatch({ type: 'setCompat', a: e.target.value })}>
                  {listPending && <option>Carregando...</option>}
                  {allReagentes.map(r => <option key={r.id} value={r.id}>{r.nome} ({r.id})</option>)}
                </select>
                {ra && <div className="mono small muted" style={{marginTop: 4}}>Classe {ra.classe} · {REATIVIDADE_CLASSES[ra.classe]}</div>}
              </div>
              <div className="field">
                <label htmlFor="compat-select-b">Substância B</label>
                <select id="compat-select-b" value={b} disabled={listPending} onChange={e => dispatch({ type: 'setCompat', b: e.target.value })}>
                  {listPending && <option>Carregando...</option>}
                  {allReagentes.map(r => <option key={r.id} value={r.id}>{r.nome} ({r.id})</option>)}
                </select>
                {rb && <div className="mono small muted" style={{marginTop: 4}}>Classe {rb.classe} · {REATIVIDADE_CLASSES[rb.classe]}</div>}
              </div>
            </div>

            <div className={`compat-result ${kind}`} style={{marginTop: 6}}>
              <div className="res-icon">
                {score >= 2 ? <Icon name="warning" size={24} stroke={2}/> : score === 1 ? <Icon name="warning" size={24} stroke={2}/> : <Icon name="check" size={24} stroke={2}/>}
              </div>
              <div style={{flex: 1}}>
                <div className="res-title">{title}</div>
                <div style={{fontSize: 12, color: 'var(--text-2)', marginTop: 2}}>
                  Resultado: <span className="mono">nível {score} / 3</span> · {ra?.nome} + {rb?.nome}
                </div>
                <div style={{marginTop: 8, fontSize: 12, color: 'var(--text-2)'}}>
                  {score === 0 && 'Os itens podem ser armazenados no mesmo armário, respeitando segregação por estado físico e classe geral.'}
                  {score === 1 && 'Recomenda-se separação física (prateleiras distintas) e bandejas de contenção independentes. Manuseio simultâneo desencorajado.'}
                  {score === 2 && 'Armazenamento conjunto bloqueado pelo sistema. Risco de reação exotérmica, liberação de gases tóxicos ou ignição.'}
                  {score === 3 && 'Combinação proibida pela matriz institucional. Bloqueio obrigatório. Misturas acidentais podem causar incêndio, explosão ou nuvem tóxica.'}
                </div>
              </div>
            </div>

            <div className="row" style={{marginTop: 12, gap: 8}}>
              <button type="button" className="btn btn-sm" onClick={() => addToast({ kind: 'success', msg: 'Parecer registrado no log de auditoria.' })}><Icon name="clipboard" size={13}/> Registrar parecer no log</button>
              <button type="button" className="btn btn-sm" disabled={score < 2} onClick={() => {
                const respA = ra?.responsavel; const respB = rb?.responsavel;
                addToast({ kind: 'success', msg: `Notificação enviada para ${respA}${respA !== respB ? ' e ' + respB : ''}.` });
              }}><Icon name="bell" size={13}/> Notificar responsáveis</button>
            </div>
          </div>
        </div>

        <div className="card">
          <SectionTitle title="Classes envolvidas" sub="Detalhamento das frases H críticas"/>
          <div className="card-body" style={{fontSize: 12}}>
            {[ra, rb].filter(Boolean).map((r, i) => (
              <div key={r.id} style={{paddingTop: i ? 12 : 0, marginTop: i ? 12 : 0, borderTop: i ? '1px solid var(--border)' : 0}}>
                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 6}}>
                  <span style={{fontWeight: 600}}>{r.nome}</span>
                  <span className="mono small muted">classe {r.classe}</span>
                </div>
                <div style={{display: 'flex', gap: 4, marginBottom: 6}}>
                  {r.pictos.map((p) => <Picto key={p} kind={p} small/>)}
                </div>
                <div style={{display: 'flex', flexDirection: 'column', gap: 3}}>
                  {r.h.slice(0, 3).map((h) => <div key={h} className="small">{h}</div>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Matriz completa */}
      <div className="card">
        <SectionTitle title="Matriz de compatibilidade · classes em uso" sub="Verde compatível · âmbar cautela · vermelho perigo · vinho proibido"/>
        <div className="card-body" style={{overflowX: 'auto'}}>
          <div className="compat-matrix" style={{gridTemplateColumns: `auto repeat(${classesPresentes.length}, 38px)`}}>
            <div className="compat-cell h" style={{height: 38, background: 'transparent', border: 0}}/>
            {classesPresentes.map(c => (
              <div key={'h' + c} className="compat-cell h" style={{height: 38}}>{c}</div>
            ))}
            {classesPresentes.map(row => (
              <Fragment key={'row' + row}>
                <div className="compat-cell h" style={{justifyContent: 'flex-start', paddingLeft: 8, paddingRight: 8, width: 'auto', minWidth: 180, display: 'flex', alignItems: 'center'}}>
                  <span style={{marginRight: 6}}>{row}.</span>{REATIVIDADE_CLASSES[row]}
                </div>
                {classesPresentes.map(col => {
                  const s = matrix?.[row]?.[col - 1] ?? 0;
                  const hasOverride = overrideSet.has(`${row}-${col}`);
                  const cls = row === col ? 'self' : s === 0 ? 's1' : s === 1 ? 's2' : 's3';
                  const label = row === col ? '—' : s === 0 ? '✓' : s === 1 ? '!' : s === 2 ? '✕' : '⨯';
                  return (
                    <div key={col} className={`compat-cell ${cls}`}
                      style={hasOverride ? { outline: '2px solid var(--accent)', outlineOffset: '-2px' } : undefined}
                      title={hasOverride ? 'Regra institucional ativa' : undefined}>
                      {label}
                    </div>
                  );
                })}
              </Fragment>
            ))}
          </div>
        </div>
        {fonte && (
          <p className="page-sub" style={{padding: '0 16px 14px'}}>
            Fonte:{' '}
            {fonte.url ? (
              <a href={fonte.url} target="_blank" rel="noreferrer">{fonte.fonte}</a>
            ) : fonte.fonte}. Abordagem consolidada em: {fonte.referencia} Mapeamento das classes,
            regra de conversão e divergências conhecidas em <code>{fonte.detalhamento}</code>.
            Revisado em {fonte.revisadoEm}.
          </p>
        )}
      </div>
    </>
  );
}
