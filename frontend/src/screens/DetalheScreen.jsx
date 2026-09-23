import { useEffect, useState } from 'react';
import { Icon, Badge, SectionTitle, Picto, Empty, validadeBadge } from '../components';
import { REATIVIDADE_CLASSES } from '../data';
import { useCompatMatriz } from '../compat/useCompatMatriz';
import { useReagente } from '../reagentes/useReagente';
import { useReagentes } from '../reagentes/useReagentes';
import { ROTULO_NIVEL, piorNivelContra } from '../compat/avaliarMistura';
import { useDeletarReagente } from '../reagentes/useDeletarReagente';
import { useLotes } from '../reagentes/useLotes';
import { useCriarLote } from '../reagentes/useCriarLote';
import { useBaixaLote } from '../reagentes/useBaixaLote';
import { useMovimentacoes } from '../reagentes/useMovimentacoes';
import { downloadRotulo, downloadRotuloLote } from '../reagentes/downloadRotulo';
import { usePode } from '../auth/permissoes';

function MovimentacoesCard({ reagenteId }) {
  const { data: movs = [], isPending } = useMovimentacoes(reagenteId);
  return (
    <div className="card">
      <SectionTitle title="Movimentações recentes" sub="trilha de auditoria deste reagente"/>
      <div style={{ padding: '4px 0' }}>
        {isPending && <div style={{ padding: '8px 14px', fontSize: 12 }}>Carregando…</div>}
        {!isPending && movs.length === 0 && <div className="muted" style={{ padding: '8px 14px', fontSize: 12 }}>Nenhuma movimentação registrada.</div>}
        {movs.map((m, i) => (
          <div key={m.id} style={{ padding: '8px 14px', borderTop: i ? '1px solid var(--border)' : 0, fontSize: 12 }}>
            <div className="mono muted" style={{ fontSize: 12 }}>{m.timestamp?.replace('T', ' ').slice(0, 16)}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2, gap: 8 }}>
              <span>{m.who} · {m.what.replace('reagente.', '')}</span>
              <Badge kind={m.risk === 'high' ? 'red' : m.risk === 'medium' ? 'amber' : 'green'}>{m.risk}</Badge>
            </div>
            <div className="muted" style={{ marginTop: 2 }}>{m.detail}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LotesCard({ reagente }) {
  const podeCriarLote = usePode('Operacao'); // POST /api/reagentes/:id/lotes
  const podeBaixarLote = usePode('Operacional'); // POST /api/reagentes/:id/lotes/:loteId/baixa
  const { data: lotes = [], isPending } = useLotes(reagente.id);
  const criarLote = useCriarLote(reagente.id);
  const baixaLote = useBaixaLote(reagente.id);
  const [novo, setNovo] = useState(null); // null = fechado; {codigo, estoque, validade}

  const salvar = () => {
    if (!novo.codigo || !novo.estoque || !novo.validade) { alert('Código, estoque e validade são obrigatórios.'); return; }
    criarLote.mutate(
      { Codigo: novo.codigo, Estoque: Number(novo.estoque), Validade: novo.validade, Abertura: null },
      { onSuccess: () => setNovo(null) }
    );
  };

  const baixar = (lote) => {
    const q = window.prompt(`Baixa no lote ${lote.codigo} (disponível: ${lote.estoque} ${reagente.unidade}):`);
    if (!q) return;
    baixaLote.mutate({ loteId: lote.id, quantidade: Number(q) });
  };

  return (
    <div className="card">
      <SectionTitle title="Lotes / frascos" sub={`${lotes.length} registrado(s)`}
        right={podeCriarLote && (
          <button type="button" className="btn btn-sm" onClick={() => setNovo({ codigo: '', estoque: '', validade: '' })}>
            <Icon name="plus" size={12}/> Novo lote
          </button>
        )}/>
      <div className="card-body" style={{ padding: 0 }}>
        {isPending && <div style={{ padding: '8px 14px', fontSize: 12 }}>Carregando…</div>}
        {!isPending && lotes.length === 0 && <div className="muted" style={{ padding: '8px 14px', fontSize: 12 }}>Nenhum lote registrado.</div>}
        {lotes.map(l => (
          <div key={l.id} style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
            <div>
              <span className="mono">{l.codigo}</span>{' '}{validadeBadge(l.validadeStatus)}
              <div className="mono small muted">val. {l.validade}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="mono tnum">{Number(l.estoque).toFixed(2)} {reagente.unidade}</span>
              <button type="button" className="btn btn-sm" title="Etiqueta com QR" onClick={() => downloadRotuloLote(reagente.id, l.id)}>QR</button>
              {podeBaixarLote && (
                <button type="button" className="btn btn-sm" disabled={baixaLote.isPending || l.estoque <= 0} onClick={() => baixar(l)}>Baixa</button>
              )}
            </div>
          </div>
        ))}
        {novo && (
          <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            <input placeholder="Código" aria-label="Código do lote" style={{ width: 90 }} value={novo.codigo} onChange={e => setNovo(s => ({ ...s, codigo: e.target.value }))}/>
            <input placeholder="Qtd." aria-label="Estoque do lote" type="number" style={{ width: 70 }} value={novo.estoque} onChange={e => setNovo(s => ({ ...s, estoque: e.target.value }))}/>
            <input aria-label="Validade do lote" type="date" style={{ width: 130 }} value={novo.validade} onChange={e => setNovo(s => ({ ...s, validade: e.target.value }))}/>
            <button type="button" className="btn btn-primary btn-sm" disabled={criarLote.isPending} onClick={salvar}>
              {criarLote.isPending ? 'Salvando…' : 'Salvar'}
            </button>
            <button type="button" className="btn btn-sm" aria-label="Cancelar novo lote" onClick={() => setNovo(null)}>×</button>
          </div>
        )}
      </div>
    </div>
  );
}

export function DetalheScreen({ state, dispatch }) {
  const { data: r, isPending, isError, refetch } = useReagente(state.detailId);
  const { data: listData } = useReagentes({ pageSize: 200 });
  const deletarMutation = useDeletarReagente();
  const podeMovimentar = usePode('Operacional'); // POST /:id/baixa e /:id/transferencia
  const podeEditar = usePode('Cadastro');          // PUT /api/reagentes/:id
  const podeExcluir = usePode('Cadastro');               // DELETE /api/reagentes/:id
  const { data: matrizData } = useCompatMatriz();
  const compatMatrix = matrizData?.matrix ?? {};

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
  const vizinhosDeArmario = todosReagentes
    .filter(x => x.local.trim() === r.local.trim() && x.id !== r.id)
    .map(x => ({ ...x, nivel: piorNivelContra(r.classe, [x.classe], compatMatrix) }))
    .sort((a, b) => b.nivel - a.nivel);
  const vizinhosExibidos = vizinhosDeArmario.slice(0, 5);
  const vizinhosOcultos = vizinhosDeArmario.length - vizinhosExibidos.length;

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
          <button type="button" className="btn btn-sm" onClick={() => dispatch({type: 'openModal', kind: 'resumoSeguranca', reagente: r})}><Icon name="clipboard" size={13}/> Resumo de segurança</button>
          {podeMovimentar && (
            <>
              <button type="button" className="btn btn-sm" onClick={() => dispatch({type: 'openModal', kind: 'baixa', reagente: r})}><Icon name="trash" size={13}/> Baixar consumo</button>
              <button type="button" className="btn btn-sm" onClick={() => dispatch({type: 'openModal', kind: 'transferirReagente', reagente: r})}><Icon name="location" size={13}/> Transferir</button>
            </>
          )}
          {podeEditar && (
            <button type="button" className="btn btn-sm" onClick={() => dispatch({type: 'openModal', kind: 'editarReagente', reagente: r})}><Icon name="settings" size={13}/> Editar</button>
          )}
          {podeExcluir && (
            <button type="button" className="btn btn-sm" style={{color: 'var(--red)'}} onClick={handleDeletar} disabled={deletarMutation.isPending}>
              <Icon name="trash" size={13}/> Excluir
            </button>
          )}
          <button type="button" className="btn btn-sm" onClick={() => downloadRotulo(r.id)}>
            <Icon name="download" size={13}/> Rótulo PDF
          </button>
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

          <LotesCard reagente={r} />
        </div>

        <div className="col">
          <div className="card">
            <SectionTitle title="Rótulo GHS"/>
            <div className="card-body" style={{background: 'var(--surface-2)'}}>
              <div className="ghs-label">
                <div className="ghs-h">
                  <span>ResQui</span>
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
          <MovimentacoesCard reagenteId={r.id} />

          <div className="card">
            <SectionTitle title="Compatibilidade rápida" sub="vs. itens no mesmo armário"/>
            <div className="card-body" style={{padding: 0}}>
              {vizinhosDeArmario.length === 0 && (
                <div className="small muted" style={{padding: '10px 14px'}}>Nenhum outro reagente cadastrado em {r.local}.</div>
              )}
              {vizinhosExibidos.map(x => {
                const kind = x.nivel === 0 ? 'green' : x.nivel === 1 ? 'amber' : 'red';
                return (
                  <div key={x.id} style={{padding: '8px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12}}>
                    <div>
                      <div>{x.nome}</div>
                      <div className="mono small muted">{x.id} · classe {x.classe}</div>
                    </div>
                    <Badge kind={kind}>{ROTULO_NIVEL[x.nivel]}</Badge>
                  </div>
                );
              })}
              {vizinhosOcultos > 0 && (
                <div className="small muted" style={{padding: '8px 14px'}}>
                  e mais {vizinhosOcultos} {vizinhosOcultos === 1 ? 'item' : 'itens'} neste local, de risco igual ou menor que os listados
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
