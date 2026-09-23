import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Icon, Tag, SectionTitle, Badge, riscoBadge, residuoStatusBadge } from '../components';
import { exportCsv } from '../utils';
import { useResíduos } from '../residuos/useResíduos';
import { useAprovarResiduos } from '../residuos/useAprovarResiduos';
import { executarEmCadaResiduo } from '../residuos/executarEmLote';
import { useLaboratorios } from '../laboratorios/useLaboratorios';
import { useToast } from '../components/ToastContext';
import { usePode } from '../auth/permissoes';
import { REATIVIDADE_CLASSES } from '../data';

const CICLO = [
  ['solicitado', 'Solicitado', 'Aguardando aprovação de um professor antes de entrar na coleta.'],
  ['aguardando-coleta', 'Aguardando coleta', 'Descarte aprovado — pronto para entrar num manifesto de coleta.'],
  ['em-coleta', 'Em coleta', 'Vinculado a um manifesto de transporte, a caminho da destinação.'],
  ['destinado', 'Destinado', 'Ciclo encerrado — a destinação foi confirmada pelo manifesto.'],
];

const DESCRICAO_REJEITADO = 'Descarte recusado. O motivo aparece na linha de cada resíduo, para quem o registrou.';

const pillBtn = { cursor: 'pointer', background: 'none', border: 'none', font: 'inherit' };

function mensagemAprovacao(ids) {
  return ids.length === 1
    ? `Descarte do resíduo #${ids[0]} aprovado. Ele já pode entrar num manifesto de coleta.`
    : `${ids.length} descartes aprovados. Eles já podem entrar num manifesto de coleta.`;
}

function mensagemAprovacaoDesfeita(ids) {
  return ids.length === 1
    ? `Aprovação do resíduo #${ids[0]} desfeita. Ele voltou para a fila de aprovação.`
    : `${ids.length} aprovações desfeitas. Os resíduos voltaram para a fila de aprovação.`;
}

function mensagemListaVazia(filter, q) {
  if (q) return `Nenhum resíduo corresponde a “${q}”${filter === 'todos' ? '' : ' nesta etapa'}.`;
  if (filter === 'todos') return 'Nenhum resíduo registrado ainda.';
  if (filter === 'solicitado') return 'Nenhuma solicitação aguardando aprovação.';
  if (filter === 'rejeitado') return 'Nenhum descarte rejeitado.';
  return `Nenhum resíduo em “${CICLO.find(([k]) => k === filter)?.[1] ?? filter}”.`;
}

function ClassesDoResiduo({ classes }) {
  if (classes.length === 0) return <div className="residuo-classes muted">Sem classes informadas</div>;
  const nomes = classes.map(c => `${c}. ${REATIVIDADE_CLASSES[c]}`).join(', ');
  return (
    <div className="residuo-classes" title={nomes}>
      <span aria-hidden="true">Classes {classes.join(' · ')}</span>
      <span className="sr-only">Classes de reatividade: {nomes}</span>
    </div>
  );
}

export function ResiduosScreen({ state, dispatch }) {
  const [filter, setFilter] = useState(state.residuosStatusInicial || 'todos');
  const [q, setQ] = useState('');
  const { data: residuos = [], isPending, isError, refetch } = useResíduos();
  const podeAprovar = usePode('Aprovador');     // PUT /api/residuos/:id/aprovar|rejeitar (RF06)
  const podeRegistrar = usePode('Operacional'); // POST /api/residuos
  // PUT /api/residuos/:id exige a policy Operacao — o Aluno cria resíduo (Operacional) mas não
  // o edita, e sem este gate o botão só rendia 403 ao salvar.
  const podeEditar = usePode('Operacao');
  const aprovar = useAprovarResiduos();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [desfazendo, setDesfazendo] = useState([]);
  const { data: labs = [] } = useLaboratorios();
  const [selecionados, setSelecionados] = useState([]);

  const list = residuos
    .filter((r) => filter === 'todos' || r.status === filter)
    .filter((r) => !q || r.tipo?.toLowerCase().includes(q.toLowerCase()) || r.composicao?.toLowerCase().includes(q.toLowerCase()));
  const descricaoEtapa = filter === 'rejeitado' ? DESCRICAO_REJEITADO : CICLO.find(([k]) => k === filter)?.[2];
  const nomeDoLab = Object.fromEntries(labs.map(l => [l.id, l.nome]));
  const solicitacoesVisiveis = podeAprovar ? list.filter(r => r.status === 'solicitado').map(r => r.id) : [];
  const selecaoVisivel = selecionados.filter(id => solicitacoesVisiveis.includes(id));
  const todasSelecionadas = solicitacoesVisiveis.length > 0 && selecaoVisivel.length === solicitacoesVisiveis.length;
  const colunas = solicitacoesVisiveis.length > 0 ? 11 : 10;

  const alternarSelecao = (id) =>
    setSelecionados(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));

  const relatarFalhas = (falhas) =>
    falhas.forEach(f => addToast(`Resíduo #${f.id}: ${f.mensagem}`, 'error'));

  const desfazerAprovacao = async (ids) => {
    setDesfazendo(prev => [...prev, ...ids]);
    const { concluidos, falhas } = await executarEmCadaResiduo(ids, 'desfazer-aprovacao');
    await queryClient.invalidateQueries({ queryKey: ['residuos'] });
    setDesfazendo(prev => prev.filter(id => !ids.includes(id)));
    if (concluidos.length > 0) addToast(mensagemAprovacaoDesfeita(concluidos), 'success');
    relatarFalhas(falhas);
  };

  const aprovarResiduos = (ids) =>
    aprovar.mutate(ids, {
      onSuccess: ({ concluidos, falhas }) => {
        setSelecionados(prev => prev.filter(id => !concluidos.includes(id)));
        if (concluidos.length > 0) {
          addToast(mensagemAprovacao(concluidos), 'success', { rotulo: 'Desfazer', executar: () => desfazerAprovacao(concluidos) });
        }
        relatarFalhas(falhas);
      },
    });

  if (isPending) return <div className="page-loading"><Icon name="refresh" size={16} /> Carregando...</div>;
  if (isError) return <div className="page-error">Erro ao carregar resíduos. <button onClick={refetch}>Tentar novamente</button></div>;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Resíduos químicos</h1>
          <p className="page-sub">{`Do registro ao destino final · ${residuos.length} registros`}</p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-sm" onClick={() => {
            const rows = [['ID', 'Tipo', 'Laboratório', 'Volume', 'Unid.', 'Status', 'Composição', 'Risco', 'MTR', 'Registrado']];
            list.forEach(r => rows.push([r.id, r.tipo, r.lab_id, r.volume, r.unidade, r.status, r.composicao, r.risco, r.mtr_id || '', r.data_registro]));
            exportCsv(rows, `residuos-${new Date().toISOString().slice(0, 10)}.csv`);
          }}><Icon name="download" size={13} /> Exportar lista</button>
          {podeRegistrar && (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => dispatch({ type: 'openModal', kind: 'novoResiduo' })}>
              <Icon name="plus" size={13} /> Registrar resíduo
            </button>
          )}
        </div>
      </div>

      <div className="card card-tight">
        <div className="toolbar" style={{ flexWrap: 'wrap' }}>
          <button type="button" className={`filter-pill ${filter === 'todos' ? 'active' : ''}`} onClick={() => setFilter('todos')} style={pillBtn}>
            Todos <span className="mono small">{residuos.length}</span>
          </button>
          <span className="ciclo-sep">·</span>
          {CICLO.map(([k, rotulo], i) => (
            <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              {i > 0 && <Icon name="chevron_right" size={11}/>}
              <button type="button" className={`filter-pill ${filter === k ? 'active' : ''}`} onClick={() => setFilter(k)} style={pillBtn}>
                {rotulo} <span className="mono small">{residuos.filter(r => r.status === k).length}</span>
              </button>
            </span>
          ))}
          <span className="ciclo-sep">·</span>
          <button type="button" className={`filter-pill ${filter === 'rejeitado' ? 'active' : ''}`} onClick={() => setFilter('rejeitado')} style={pillBtn}>
            Rejeitados <span className="mono small">{residuos.filter(r => r.status === 'rejeitado').length}</span>
          </button>
          <div className="input" style={{ marginLeft: 'auto' }}>
            <Icon name="search" size={14} />
            <input
              aria-label="Buscar resíduo"
              placeholder="Buscar resíduo…"
              value={q}
              onChange={e => setQ(e.target.value)}
            />
          </div>
        </div>
        {descricaoEtapa && (
          <div className="ciclo-desc" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span>{descricaoEtapa}</span>
            {filter === 'aguardando-coleta' && podeEditar && residuos.some(r => r.status === 'aguardando-coleta') && (
              <button type="button" className="btn btn-sm btn-primary" onClick={() => dispatch({ type: 'openModal', kind: 'novoMtr' })}>
                <Icon name="truck" size={12}/> Criar manifesto de coleta
              </button>
            )}
            {filter === 'em-coleta' && podeEditar && residuos.some(r => r.status === 'em-coleta') && (
              <button type="button" className="btn btn-sm" onClick={() => dispatch({ type: 'nav', screen: 'mtr' })}>
                Confirmar destinação nos manifestos <Icon name="chevron_right" size={12}/>
              </button>
            )}
          </div>
        )}
        {selecaoVisivel.length > 0 && (
          <div className="lote-bar" role="region" aria-label="Ações em lote">
            <span>
              {selecaoVisivel.length === 1 ? '1 solicitação selecionada' : `${selecaoVisivel.length} solicitações selecionadas`}
            </span>
            <button type="button" className="btn btn-sm btn-primary" disabled={aprovar.isPending}
              onClick={() => aprovarResiduos(selecaoVisivel)}>
              {aprovar.isPending ? 'Aprovando…' : `Aprovar ${selecaoVisivel.length}`}
            </button>
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setSelecionados([])}>
              Limpar seleção
            </button>
          </div>
        )}
        <table className="tbl">
          <thead>
            <tr>
              {solicitacoesVisiveis.length > 0 && (
                <th className="col-selecao">
                  <input type="checkbox" aria-label="Selecionar todas as solicitações visíveis"
                    checked={todasSelecionadas}
                    onChange={() => setSelecionados(todasSelecionadas ? [] : solicitacoesVisiveis)} />
                </th>
              )}
              <th>ID</th><th>Tipo</th><th>Composição</th><th>Laboratório</th>
              <th className="right">Volume</th><th>Risco</th><th>Status</th>
              <th>Registrado</th><th>MTR</th><th></th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr><td colSpan={colunas} className="empty">{mensagemListaVazia(filter, q)}</td></tr>
            )}
            {list.map((r) => (
              <tr key={r.id} className={state.flashId === r.id ? 'flash selected' : selecaoVisivel.includes(r.id) ? 'selected' : ''}>
                {solicitacoesVisiveis.length > 0 && (
                  <td className="col-selecao">
                    {r.status === 'solicitado' && (
                      <input type="checkbox" aria-label={`Selecionar resíduo #${r.id}`}
                        checked={selecaoVisivel.includes(r.id)} onChange={() => alternarSelecao(r.id)} />
                    )}
                  </td>
                )}
                <td className="num">{r.id}</td>
                <td>{r.tipo}</td>
                <td>
                  <div className="small muted">{r.composicao}</div>
                  <ClassesDoResiduo classes={r.classes ?? []} />
                  {r.status === 'rejeitado' && r.motivoRejeicao && (
                    <div className="residuo-motivo">Motivo da rejeição: {r.motivoRejeicao}</div>
                  )}
                </td>
                <td className="small" title={r.lab_id}>{nomeDoLab[r.lab_id] ?? <Tag>{r.lab_id}</Tag>}</td>
                <td className="num right">{r.volume} {r.unidade}</td>
                <td>{riscoBadge(r.risco)}</td>
                <td>{residuoStatusBadge(r.status)}</td>
                <td className="mono small muted">{r.data_registro?.slice(0, 10)}</td>
                <td className="mono small">{r.mtr_id || <span className="muted">-</span>}</td>
                <td>
                  <div className="tbl-acoes">
                  {podeAprovar && r.status === 'solicitado' && (
                    <>
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        disabled={aprovar.isPending}
                        onClick={() => aprovarResiduos([r.id])}
                      >
                        Aprovar
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        onClick={() => dispatch({ type: 'openModal', kind: 'rejeitarResiduo', residuo: r })}
                      >
                        Rejeitar
                      </button>
                    </>
                  )}
                  {podeAprovar && r.status === 'aguardando-coleta' && !r.mtr_id && (
                    <button
                      type="button"
                      className="btn btn-sm"
                      disabled={desfazendo.includes(r.id)}
                      onClick={() => desfazerAprovacao([r.id])}
                    >
                      {desfazendo.includes(r.id) ? 'Desfazendo…' : 'Desfazer aprovação'}
                    </button>
                  )}
                  {podeEditar && (
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => dispatch({ type: 'openModal', kind: 'editarResiduo', residuo: r })}
                    >
                      Editar
                    </button>
                  )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
