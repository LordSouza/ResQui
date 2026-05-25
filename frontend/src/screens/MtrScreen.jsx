import { useState } from 'react';
import { Icon, Tag, SectionTitle, mtrStatusBadge } from '../components';
import { useMtrs } from '../mtrs/useMtrs';
import { useEnviarSinir } from '../mtrs/useEnviarSinir';
import { useEnviarBatch } from '../mtrs/useEnviarBatch';

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
                <td>
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
    </>
  );
}
