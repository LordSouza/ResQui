import { useState } from 'react';
import { Icon, Tag, SectionTitle, riscoBadge } from '../components';
import { useMtrs } from '../mtrs/useMtrs';
import { useResíduos } from '../residuos/useResíduos';
import { downloadMtrPdf } from '../mtrs/downloadMtr';
import { FormPreviewMtrPdf, FormConfirmarDestinacao, ConfirmReabrirDestinacao } from '../forms/residuos';
import { usePode } from '../auth/permissoes';
import { formatarQuantidade } from '../utils';

function MtrDetalhe({ mtr }) {
  const { data: residuos = [], isPending } = useResíduos({ mtrId: mtr.id });
  const [preview, setPreview] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [reabrindo, setReabrindo] = useState(false);
  const podeDestinar = usePode('Tecnico');   // POST /api/mtrs/:id/destinacao
  const podeReabrir = usePode('Gestor');     // DELETE /api/mtrs/:id/destinacao
  return (
    <>
    <div className="detail-grid">
      <div className="card card-tight">
        <SectionTitle title="Resíduos vinculados" sub={`${(mtr.residuo_ids ?? []).length} item(ns) neste manifesto`} />
        <table className="tbl">
          <thead><tr><th>#</th><th>Descrição</th><th>Tipo</th><th className="right">Volume</th><th>Risco</th></tr></thead>
          <tbody>
            {isPending && <tr><td colSpan={5}>Carregando…</td></tr>}
            {!isPending && residuos.length === 0 && <tr><td colSpan={5} className="muted">Nenhum resíduo vinculado.</td></tr>}
            {residuos.map((r) => (
              <tr key={r.id}>
                <td className="num">#{r.id}</td>
                <td>{r.descricao}</td>
                <td className="small">{r.tipo}</td>
                <td className="num right">{Number(r.volume ?? 0)} {r.unidade}</td>
                <td>{riscoBadge(r.risco)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <SectionTitle title={mtr.numero} sub="Dados do manifesto" />
        <div className="card-body">
          <div className="kv">
            <div className="k">Emissão</div><div className="v mono">{mtr.data_emissao?.slice(0, 10)}</div>
            <div className="k">Gerador</div><div className="v">{mtr.gerador}</div>
            <div className="k">Transportadora</div><div className="v">{mtr.transportadora}</div>
            <div className="k">Destinador</div><div className="v">{mtr.destinador ?? '-'}</div>
            <div className="k">Cód. IBAMA</div><div className="v mono">{mtr.codigo_ibama ?? '-'}</div>
            <div className="k">Quantidade</div><div className="v mono">{formatarQuantidade({ litros: mtr.total_litros, quilos: mtr.total_quilos })}</div>
            <div className="k">Destinação</div><div className="v mono">{mtr.data_destinacao ?? '—'}</div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>
            <button type="button" className="btn btn-sm" onClick={() => setPreview(true)}>
              <Icon name="search" size={12} /> Pré-visualizar
            </button>
            <button type="button" className="btn btn-sm" onClick={() => downloadMtrPdf(mtr.id, mtr.numero)}>
              <Icon name="download" size={12} /> PDF
            </button>
            {podeDestinar && !mtr.data_destinacao && (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setConfirmando(true)}>
                <Icon name="check" size={12} /> Confirmar destinação
              </button>
            )}
            {podeReabrir && mtr.data_destinacao && (
              <button type="button" className="btn btn-sm" onClick={() => setReabrindo(true)}>
                <Icon name="refresh" size={12} /> Reabrir manifesto
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
    {preview && <FormPreviewMtrPdf mtr={mtr} residuos={residuos} onClose={() => setPreview(false)} />}
    {confirmando && <FormConfirmarDestinacao mtr={mtr} residuos={residuos} onClose={() => setConfirmando(false)} />}
    {reabrindo && <ConfirmReabrirDestinacao mtr={mtr} residuos={residuos} onClose={() => setReabrindo(false)} />}
    </>
  );
}

export function MtrScreen({ state, dispatch }) {
  const [selectedId, setSelectedId] = useState(null);
  const podeEmitir = usePode('Tecnico'); // POST /api/mtrs
  const { data: mtrs = [], isPending, isError, refetch } = useMtrs();

  const sel = mtrs.find(m => m.id === selectedId) ?? mtrs[0];

  if (isPending) return <div className="page-loading"><Icon name="refresh" size={16} /> Carregando...</div>;
  if (isError) return <div className="page-error">Erro ao carregar MTRs. <button onClick={refetch}>Tentar novamente</button></div>;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Manifestos</h1>
          <p className="page-sub">Manifestos de transporte de resíduos · documento interno de rastreabilidade</p>
        </div>
        <div className="page-actions">
          {podeEmitir && (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => dispatch({ type: 'openModal', kind: 'novoMtr' })}>
              <Icon name="plus" size={13} /> Novo manifesto
            </button>
          )}
        </div>
      </div>

      <div className="card card-tight" style={{ marginBottom: 16 }}>
        <SectionTitle title="Manifestos emitidos" sub={`${mtrs.length} no período · clique para ver detalhes`} />
        <table className="tbl">
          <thead>
            <tr>
              <th>Número</th><th>Emissão</th><th>Resíduos</th>
              <th className="right">Quantidade</th><th>Cód. IBAMA</th>
              <th>Transportador</th><th>Destinador</th><th>Destinação</th><th></th>
            </tr>
          </thead>
          <tbody>
            {mtrs.map((m) => (
              <tr key={m.id} className={`${m.id === sel?.id ? 'selected' : ''} ${state.flashId === m.id ? 'flash' : ''}`.trim()} tabIndex={0}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedId(m.id); } }}
                onClick={() => setSelectedId(m.id)}>
                <td className="num">{m.numero}</td>
                <td className="mono small">{m.data_emissao?.slice(0, 10)}</td>
                <td className="small">{(m.residuo_ids ?? []).map((id) => <Tag key={id}>#{id}</Tag>)}</td>
                <td className="num right">{formatarQuantidade({ litros: m.total_litros, quilos: m.total_quilos })}</td>
                <td className="mono">{m.codigo_ibama ?? '-'}</td>
                <td>{m.transportadora}</td>
                <td>{m.destinador ?? '-'}</td>
                <td className="mono small">{m.data_destinacao ?? '—'}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button type="button" className="btn btn-sm" title="Gerar manifesto em PDF"
                    onClick={(e) => { e.stopPropagation(); downloadMtrPdf(m.id, m.numero); }}>
                    PDF
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sel && <MtrDetalhe mtr={sel} />}
    </>
  );
}
