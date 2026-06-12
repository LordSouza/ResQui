import { useEffect } from 'react';
import { Icon, Badge, SectionTitle, Picto, Empty, validadeBadge } from '../components';
import { REATIVIDADE_CLASSES } from '../data';
import { useCompatMatriz } from '../compat/useCompatMatriz';
import { useReagente } from '../reagentes/useReagente';
import { useReagentes } from '../reagentes/useReagentes';
import { useDeletarReagente } from '../reagentes/useDeletarReagente';
import { useAuth } from '../auth/AuthContext';

export function DetalheScreen({ state, dispatch }) {
  const { data: r, isPending, isError, refetch } = useReagente(state.detailId);
  const { data: listData } = useReagentes({ pageSize: 200 });
  const deletarMutation = useDeletarReagente();
  const { user } = useAuth();
  const { data: compatMatrix = {} } = useCompatMatriz();

  // Redirect to inventario when reagent not found (404)
  useEffect(() => {
    if (r === null) dispatch({ type: 'nav', screen: 'inventario' });
  }, [r, dispatch]);

  if (isPending) {
    return <div className="page-loading"><Icon name="refresh" size={16}/> Carregando...</div>;
  }

  if (isError) {
    return (
      <div className="page-error">
        Erro ao carregar dados. <button type="button" onClick={refetch}>Tentar novamente</button>
      </div>
    );
  }

  if (r === null || !r) return null;  // useEffect handles redirect; just suppress render

  const todosReagentes = listData?.items ?? [];
  const mesmoArmario = todosReagentes.filter(
    x => x.local.split('·')[0].trim() === r.local.split('·')[0].trim() && x.id !== r.id
  ).slice(0, 5);

  const handleDeletar = () => {
    if (!window.confirm(`Excluir ${r.nome} (${r.id}) permanentemente?`)) return;
    deletarMutation.mutate(r.id, {
      onSuccess: () => dispatch({ type: 'nav', screen: 'inventario' }),
    });
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="crumb" style={{marginBottom: 4}}>
            <button type="button" onClick={() => dispatch({type: 'nav', screen: 'inventario'})} style={{cursor: 'pointer', color: 'var(--accent)', background: 'none', border: 'none', padding: 0, font: 'inherit'}}>Inventário</button>
            <Icon name="chevron_right" size={10}/>
            <span className="here">{r.nome}</span>
          </div>
          <h1 className="page-title">{r.nome}</h1>
          <p className="page-sub">
            <span className="mono">{r.id}</span> · CAS {r.cas} · {r.formula} · {r.sinonimo}
          </p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-sm" onClick={() => dispatch({type: 'openModal', kind: 'previewFispq', reagente: r})}><Icon name="download" size={13}/> FISPQ</button>
          <button type="button" className="btn btn-sm" onClick={() => dispatch({type: 'openModal', kind: 'baixa', reagente: r})}><Icon name="trash" size={13}/> Baixar consumo</button>
          <button type="button" className="btn btn-sm" onClick={() => dispatch({type: 'openModal', kind: 'editarReagente', reagente: r})}><Icon name="settings" size={13}/> Editar</button>
          {user?.papel === 'Admin' && (
            <button type="button" className="btn btn-sm" style={{color: 'var(--red)'}} onClick={handleDeletar} disabled={deletarMutation.isPending}>
              <Icon name="trash" size={13}/> Excluir
            </button>
          )}
          <button type="button" className="btn btn-primary btn-sm" onClick={() => {
            const original = document.querySelector('.ghs-label');
            if (!original) { window.print(); return; }
            let portal = document.getElementById('print-portal');
            if (portal) portal.remove();
            portal = document.createElement('div');
            portal.id = 'print-portal';
            portal.appendChild(original.cloneNode(true));
            document.body.appendChild(portal);
            document.body.classList.add('printing-label');
            const cleanup = () => {
              document.body.classList.remove('printing-label');
              const p = document.getElementById('print-portal');
              if (p) p.remove();
              window.removeEventListener('afterprint', cleanup);
            };
            window.addEventListener('afterprint', cleanup);
            setTimeout(() => { window.print(); setTimeout(cleanup, 1000); }, 50);
          }}>
            <Icon name="clipboard" size={13}/> Imprimir rótulo
          </button>
        </div>
      </div>

      <div className="detail-grid-3">
        <div className="col">
          <div className="card">
            <SectionTitle title="Identificação"/>
            <div className="card-body">
              <div className="kv">
                <div className="k">ID interno</div><div className="v mono">{r.id}</div>
                <div className="k">CAS</div><div className="v mono">{r.cas}</div>
                <div className="k">Fórmula</div><div className="v">{r.formula}</div>
                <div className="k">Lote</div><div className="v mono">{r.lote}</div>
                <div className="k">Classe de reat.</div><div className="v">{r.classe}. {REATIVIDADE_CLASSES[r.classe]}</div>
                <div className="k">Aberto em</div><div className="v mono">{r.abertura}</div>
                <div className="k">Controlado</div><div className="v">{r.controlado ? <span style={{display:'inline-flex', flexWrap:'wrap', gap:4}}><Badge kind="purple">PF-DAF</Badge><Badge kind="purple">Decreto 7842</Badge></span> : <span className="muted">Não</span>}</div>
              </div>
            </div>
          </div>

          <div className="card">
            <SectionTitle title="Localização e estoque"/>
            <div className="card-body">
              <div className="kv">
                <div className="k">Local</div><div className="v">{r.local}</div>
                <div className="k">Responsável</div><div className="v">{r.responsavel}</div>
                <div className="k">Estoque atual</div>
                <div className="v" style={{display:'flex', flexWrap:'wrap', alignItems:'center', gap:6}}>
                  <span className="mono tnum" style={{fontSize: 16, fontWeight: 600}}>{r.estoque?.toFixed(2)} {r.unidade}</span>
                  {r.estoque_min && r.estoque < r.estoque_min && (
                    <Badge kind="red" dot>mín. {r.estoque_min} {r.unidade}</Badge>
                  )}
                </div>
                <div className="k">Validade</div>
                <div className="v">
                  <span className="mono">{r.validade}</span>
                  {' '}{validadeBadge(r.validade_status)}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col">
          <div className="card">
            <SectionTitle title="Rótulo GHS" sub="ABNT NBR 14725-3"
              right={<button type="button" className="btn btn-sm" onClick={() => {
                dispatch({type: 'refresh'});
              }}><Icon name="refresh" size={12}/> Regenerar</button>}/>
            <div className="card-body" style={{background: 'var(--surface-2)'}}>
              <div className="ghs-label">
                <div className="ghs-h">
                  <span>UNIFEI · IMC</span>
                  <span>{r.id} · {r.lote}</span>
                </div>
                <div className="ghs-name">{r.nome}</div>
                <div className="ghs-syn">{r.sinonimo} · CAS {r.cas} · {r.formula}</div>
                <div className="ghs-pictos">
                  {(r.pictos ?? []).map((p) => <Picto key={p} kind={p}/>)}
                </div>
                <div className="ghs-signal" style={{background: r.signal === 'Perigo' ? '#c00' : '#b76e00'}}>
                  {r.signal}
                </div>
                <div className="ghs-h-statements">
                  <div className="lbl">Frases H</div>
                  {(r.h ?? []).map((h) => <div key={h}>{h}</div>)}
                </div>
                <div className="ghs-p-statements">
                  <div className="lbl">Frases P</div>
                  {(r.p ?? []).map((p) => <div key={p}>{p}</div>)}
                </div>
                <div className="ghs-foot">
                  <span>Validade: {r.validade}</span>
                  <span style={{textAlign: 'right'}}>Aberto: {r.abertura}</span>
                  <span>{r.local}</span>
                  <span style={{textAlign: 'right'}}>Resp: {r.responsavel?.split(' ').slice(0, 2).join(' ')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col">
          <div className="card">
            <SectionTitle title="Movimentações recentes"/>
            <div style={{padding: '4px 0'}}>
              {[
                ['2025-11-22 08:42', 'Renan Costa', 'Consumo', '-0.20 L'],
                ['2025-11-15 10:01', 'Renan Costa', 'Consumo', '-0.50 L'],
                ['2025-11-08 14:30', 'Téc. Carlos', 'Transferência', 'Lab-201 → Lab-203'],
                ['2025-10-22 09:11', 'sistema', 'Compat. OK', 'verificação'],
                ['2025-10-04 16:45', 'Renan Costa', 'Abertura', '+ frasco 4 L'],
              ].map((m, i) => (
                <div key={m[0]} style={{padding: '8px 14px', borderTop: i ? '1px solid var(--border)' : 0, fontSize: 12}}>
                  <div className="mono muted" style={{fontSize: 12}}>{m[0]}</div>
                  <div style={{display: 'flex', justifyContent: 'space-between', marginTop: 2}}>
                    <span>{m[1]} · {m[2]}</span>
                    <span className="mono">{m[3]}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <SectionTitle title="Compatibilidade rápida" sub="vs. itens no mesmo armário"/>
            <div className="card-body" style={{padding: 0}}>
              {mesmoArmario.map(x => {
                const score = (compatMatrix[r.classe] || [])[x.classe - 1] ?? 0;
                const kind = score === 0 ? 'green' : score === 1 ? 'amber' : 'red';
                const label = score === 0 ? 'Compatível' : score === 1 ? 'Cautela' : score === 2 ? 'Perigo' : 'Proibido';
                return (
                  <div key={x.id} style={{padding: '8px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12}}>
                    <div>
                      <div>{x.nome}</div>
                      <div className="mono small muted">{x.id} · classe {x.classe}</div>
                    </div>
                    <Badge kind={kind}>{label}</Badge>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
