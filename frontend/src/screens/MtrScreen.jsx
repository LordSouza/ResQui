import { useState } from 'react';
import { Icon, Tag, SectionTitle, mtrStatusBadge, riscoBadge } from '../components';
import { useMtrs } from '../mtrs/useMtrs';
import { useEnviarSinir } from '../mtrs/useEnviarSinir';
import { useEnviarBatch } from '../mtrs/useEnviarBatch';
import { useResíduos } from '../residuos/useResíduos';
import { downloadSinirCsv, downloadMtrPdf } from '../mtrs/downloadMtr';

function MtrDetalhe({ mtr, dispatch, enviarSinir }) {
  const { data: residuos = [], isPending } = useResíduos({ mtrId: mtr.id });
  return (
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
        <SectionTitle title={mtr.numero} sub="Dados do manifesto" right={mtrStatusBadge(mtr.status)} />
        <div className="card-body">
          <div className="kv">
            <div className="k">Emissão</div><div className="v mono">{mtr.data_emissao?.slice(0, 10)}</div>
            <div className="k">Gerador</div><div className="v">{mtr.gerador}</div>
            <div className="k">Transportadora</div><div className="v">{mtr.transportadora}</div>
            <div className="k">Destinador</div><div className="v">{mtr.destinador ?? '-'}</div>
            <div className="k">Cód. IBAMA</div><div className="v mono">{mtr.codigo_ibama ?? '-'}</div>
            <div className="k">Massa total</div><div className="v mono">{Number(mtr.massa ?? 0).toFixed(2)} kg</div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>
            <button type="button" className="btn btn-sm" onClick={() => downloadSinirCsv(mtr.id, mtr.numero)}>
              <Icon name="download" size={12} /> CSV SINIR
            </button>
            <button type="button" className="btn btn-sm" onClick={() => downloadMtrPdf(mtr.id, mtr.numero)}>
              <Icon name="download" size={12} /> PDF
            </button>
            {mtr.status === 'rascunho' && (
              <button type="button" className="btn btn-primary btn-sm" disabled={enviarSinir.isPending}
                onClick={() => enviarSinir.mutate(mtr.id, { onSuccess: (r) => { alert(r.mensagem); dispatch({ type: 'refresh' }); } })}>
                <Icon name="upload" size={12} /> Enviar ao SINIR
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function MtrScreen({ state, dispatch }) {
  const [selectedId, setSelectedId] = useState(null);
  const { data: mtrs = [], isPending, isError, refetch } = useMtrs();
  const enviarSinir = useEnviarSinir();
  const enviarBatch = useEnviarBatch();

  const sel = mtrs.find(m => m.id === selectedId) ?? mtrs[0];
  const rascunhos = mtrs.filter(m => m.status === 'rascunho');

  if (isPending) return <div className="page-loading"><Icon name="refresh" size={16} /> Carregando...</div>;
  if (isError) return <div className="page-error">Erro ao carregar MTRs. <button onClick={refetch}>Tentar novamente</button></div>;

  const handleEnviarBatch = () => {
    if (rascunhos.length === 0) {
      alert('Nenhum MTR em rascunho para enviar.');
      return;
    }
    enviarBatch.mutate(undefined, {
      onSuccess: (results) => {
        const enviados = results.filter(r => r.sucesso).length;
        alert(`${enviados} MTR(s) aceito(s) pelo SINIR.`);
        dispatch({ type: 'refresh' });
      },
    });
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Pré-MTR · SINIR</h1>
          <p className="page-sub">Manifesto de Transporte de Resíduos · Resolução ANTT 5947/21 · integração SINIR/IBAMA</p>
        </div>
        <div className="page-actions">
          <button
            type="button"
            className="btn btn-sm"
            onClick={handleEnviarBatch}
            disabled={enviarBatch.isPending || rascunhos.length === 0}
          >
            <Icon name="upload" size={13} /> {enviarBatch.isPending ? 'Enviando…' : 'Enviar ao SINIR'}
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => dispatch({ type: 'openModal', kind: 'novoMtr' })}>
            <Icon name="plus" size={13} /> Novo Pré-MTR
          </button>
        </div>
      </div>

      <div className="card card-tight" style={{ marginBottom: 16 }}>
        <SectionTitle title="MTRs emitidos" sub={`${mtrs.length} no período · clique para ver detalhes`} />
        <table className="tbl">
          <thead>
            <tr>
              <th>Número</th><th>Emissão</th><th>Resíduos</th>
              <th className="right">Massa</th><th>Cód. IBAMA</th>
              <th>Transportador</th><th>Destinador</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {mtrs.map((m) => (
              <tr key={m.id} className={m.id === sel?.id ? 'selected' : ''} onClick={() => setSelectedId(m.id)}>
                <td className="num">{m.numero}</td>
                <td className="mono small">{m.data_emissao?.slice(0, 10)}</td>
                <td className="small">{(m.residuo_ids ?? []).map((id) => <Tag key={id}>#{id}</Tag>)}</td>
                <td className="num right">{Number(m.massa ?? 0).toFixed(1)} kg</td>
                <td className="mono">{m.codigo_ibama ?? '-'}</td>
                <td>{m.transportadora}</td>
                <td>{m.destinador ?? '-'}</td>
                <td>{mtrStatusBadge(m.status)}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button type="button" className="btn btn-sm" title="Exportar pré-MTR (layout SINIR)"
                    onClick={(e) => { e.stopPropagation(); downloadSinirCsv(m.id, m.numero); }}>
                    CSV
                  </button>{' '}
                  <button type="button" className="btn btn-sm" title="Gerar manifesto em PDF"
                    onClick={(e) => { e.stopPropagation(); downloadMtrPdf(m.id, m.numero); }}>
                    PDF
                  </button>{' '}
                  {m.status === 'rascunho' && (
                    <button
                      type="button"
                      className="btn btn-sm"
                      disabled={enviarSinir.isPending}
                      onClick={(e) => {
                        e.stopPropagation();
                        enviarSinir.mutate(m.id, {
                          onSuccess: (r) => {
                            alert(r.mensagem);
                            dispatch({ type: 'refresh' });
                          },
                        });
                      }}
                    >
                      Enviar SINIR
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sel && <MtrDetalhe mtr={sel} dispatch={dispatch} enviarSinir={enviarSinir} />}
    </>
  );
}
