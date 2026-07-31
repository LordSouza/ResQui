import { useState, useEffect, useMemo, useReducer } from 'react';
import { Icon, Badge } from '../components';
import { exportCsv } from '../utils';
import { useChamados } from '../chamados/useChamados';
import { useAtualizarStatusChamado } from '../chamados/useAtualizarStatusChamado';
import { useComentarChamado } from '../chamados/useComentarChamado';
import { useAuth } from '../auth/AuthContext';

const statusChamado = (s) => {
  const map = {
    'aberto': ['amber', 'Aberto'],
    'em-analise': ['blue', 'Em análise'],
    'resolvido': ['green', 'Resolvido'],
    'fechado': ['gray', 'Fechado'],
  };
  const [kind, label] = map[s] || ['gray', s];
  return <Badge kind={kind} dot>{label}</Badge>;
};

const sevChamado = (s) => {
  const map = {
    'baixa': ['gray', 'Baixa'],
    'media': ['blue', 'Média'],
    'alta': ['amber', 'Alta'],
    'critica': ['red', 'Crítica'],
  };
  const [kind, label] = map[s] || ['gray', s];
  return <Badge kind={kind}>{label}</Badge>;
};

const tipoChamado = (t) => {
  const map = {
    'bug': '🐛 Bug',
    'feature': '💡 Sugestão',
    'ui': '🎨 Interface',
    'performance': '⚡ Performance',
    'conformidade': '📋 Conformidade',
    'outro': 'Outro',
  };
  return map[t] || t;
};

function ChamadoDetail({ chamado, onClose, dispatch }) {
  const c = chamado;
  const { user } = useAuth();
  const [comentario, setComentario] = useState('');
  const atualizarStatus = useAtualizarStatusChamado();
  const comentarMutation = useComentarChamado();

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const updateStatus = (novoStatus) => {
    atualizarStatus.mutate({ id: c.id, status: novoStatus }, {
      onSuccess: () => dispatch({ type: 'refresh' }),
    });
  };

  const enviarComentario = () => {
    if (!comentario.trim()) return;
    comentarMutation.mutate({ id: c.id, texto: comentario.trim() }, {
      onSuccess: () => setComentario(''),
    });
  };

  return (
    <button type="button" className="drawer-backdrop" onClick={onClose} aria-label="Fechar painel do chamado">
      <div className="drawer" role="dialog" tabIndex={-1} onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()} style={{width: 560}}>
        <div className="drawer-h">
          <div style={{flex: 1, minWidth: 0}}>
            <div style={{fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-3)', marginBottom: 4}}>{c.id} · {tipoChamado(c.tipo)}</div>
            <div className="drawer-title" style={{lineHeight: 1.3}}>{c.titulo}</div>
            <div style={{display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap'}}>
              {statusChamado(c.status)}
              {sevChamado(c.severidade)}
            </div>
          </div>
          <button type="button" className="close" aria-label="Fechar painel" onClick={onClose}>
            <Icon name="close" size={16}/>
          </button>
        </div>

        <div className="drawer-body">
          <div className="drawer-section">
            <div className="drawer-section-h"><h4>Descrição</h4></div>
            <div style={{fontSize: 13, lineHeight: 1.6, color: 'var(--text)', whiteSpace: 'pre-wrap'}}>{c.descricao}</div>
          </div>

          {c.resolucao && (
            <div className="drawer-section">
              <div className="drawer-section-h"><h4 style={{color: 'var(--green)'}}>Resolução</h4></div>
              <div style={{fontSize: 13, lineHeight: 1.6, padding: 12, background: 'var(--green-soft)', border: '1px solid #b8dec7', borderRadius: 'var(--radius)'}}>
                {c.resolucao}
              </div>
            </div>
          )}

          <div className="drawer-section">
            <div className="drawer-section-h"><h4>Metadados</h4></div>
            <div className="kv">
              <div className="k">Aberto por</div><div className="v">{c.abertoPorId ?? 'usuário removido'}</div>
              <div className="k">Criado em</div><div className="v mono">{c.criadoEm?.slice(0, 10)}</div>
            </div>
          </div>

          {c.comentarios && c.comentarios.length > 0 && (
            <div className="drawer-section">
              <div className="drawer-section-h">
                <h4>Histórico de comentários</h4>
                <span className="small muted mono">{c.comentarios.length} comentário{c.comentarios.length > 1 ? 's' : ''}</span>
              </div>
              <div style={{display: 'flex', flexDirection: 'column', gap: 10}}>
                {c.comentarios.map((com) => {
                  const eu = com.autorId === user?.id;
                  return (
                    <div key={com.id} style={{display: 'flex', gap: 10}}>
                      <div className={`comment-avatar ${eu ? 'eu' : 'outro'}`}>
                        {(com.autorId ?? '—').slice(0, 2).toUpperCase()}
                      </div>
                      <div style={{flex: 1, minWidth: 0}}>
                        <div style={{display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 3, flexWrap: 'wrap'}}>
                          <span style={{fontSize: 12.5, fontWeight: 600}}>{com.autorId ?? 'usuário removido'}</span>
                          <span style={{fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--text-3)'}}>{com.criadoEm?.slice(0, 16)}</span>
                        </div>
                        <div className={`comment-bubble ${eu ? 'eu' : 'outro'}`}>{com.texto}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {c.status !== 'fechado' && (
            <div className="drawer-section">
              <div className="drawer-section-h"><h4>Adicionar comentário</h4></div>
              <textarea aria-label="Comentário" className="comment-textarea" value={comentario} onChange={e => setComentario(e.target.value)} rows={3}
                placeholder="Escreva uma resposta para o usuário…"/>
              <button type="button" className="btn btn-sm btn-primary" style={{marginTop: 8}} onClick={enviarComentario} disabled={!comentario.trim()}>
                <Icon name="send" size={12}/> Publicar comentário
              </button>
            </div>
          )}
        </div>

        <div className="drawer-foot">
          <div className="small muted" style={{flex: 1}}>
            {c.comentarios && c.comentarios.length > 0 ? `${c.comentarios.length} comentário${c.comentarios.length > 1 ? 's' : ''} no histórico` : 'Sem comentários ainda'}
          </div>
          {c.status === 'fechado' ? (
            <button type="button" className="btn btn-sm" onClick={onClose}>Fechar painel</button>
          ) : (
            <>
              {c.status === 'aberto' && (
                <button type="button" className="btn btn-sm" onClick={() => updateStatus('em-analise')}>
                  <Icon name="refresh" size={12}/> Em análise
                </button>
              )}
              {(c.status === 'aberto' || c.status === 'em-analise') && (
                <button type="button" className="btn btn-sm btn-primary" onClick={() => updateStatus('resolvido')}>
                  <Icon name="check" size={12}/> Resolver
                </button>
              )}
              {c.status === 'resolvido' && (
                <>
                  <button type="button" className="btn btn-sm" onClick={() => updateStatus('em-analise')} style={{color: 'var(--amber)'}}>
                    <Icon name="refresh" size={12}/> Reabrir
                  </button>
                  <button type="button" className="btn btn-sm btn-primary" onClick={() => updateStatus('fechado')}>
                    <Icon name="check" size={12}/> Fechar
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </button>
  );
}

function chamadosReducer(s, a) {
  switch (a.type) {
    case 'setStatusFilter': return { ...s, statusFilter: a.value };
    case 'setTipoFilter':   return { ...s, tipoFilter: a.value };
    case 'setSevFilter':    return { ...s, sevFilter: a.value };
    case 'setQuery':        return { ...s, query: a.value };
    case 'setSelecionado':  return { ...s, selecionado: a.value };
    default: return s;
  }
}

export function ChamadosScreen({ state, dispatch }) {
  const [filters, filtersDispatch] = useReducer(chamadosReducer, {
    statusFilter: 'abertos',
    tipoFilter: 'todos',
    sevFilter: 'todas',
    query: '',
    selecionado: null,
  });
  const { statusFilter, tipoFilter, sevFilter, query, selecionado } = filters;
  const setStatusFilter = (value) => filtersDispatch({ type: 'setStatusFilter', value });
  const setTipoFilter   = (value) => filtersDispatch({ type: 'setTipoFilter', value });
  const setSevFilter    = (value) => filtersDispatch({ type: 'setSevFilter', value });
  const setQuery        = (value) => filtersDispatch({ type: 'setQuery', value });
  const setSelecionado  = (value) => filtersDispatch({ type: 'setSelecionado', value });

  // Stable export date (avoids hydration mismatch)
  const exportDate = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const { data: all = [], isPending, isError, refetch } = useChamados();

  if (isPending) return <div className="page-loading"><Icon name="refresh" size={16}/> Carregando chamados…</div>;
  if (isError) return <div className="page-error">Erro ao carregar chamados. <button onClick={refetch}>Tentar novamente</button></div>;

  const list = all.filter(c => {
    if (statusFilter === 'abertos' && (c.status === 'resolvido' || c.status === 'fechado')) return false;
    if (statusFilter === 'fechados' && (c.status === 'aberto' || c.status === 'em-analise')) return false;
    if (statusFilter !== 'todos' && statusFilter !== 'abertos' && statusFilter !== 'fechados' && c.status !== statusFilter) return false;
    if (tipoFilter !== 'todos' && c.tipo !== tipoFilter) return false;
    if (sevFilter !== 'todas' && c.severidade !== sevFilter) return false;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      const hay = `${c.id} ${c.titulo} ${c.descricao} ${c.abertoPorId ?? ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const stats = {
    aberto: all.filter(c => c.status === 'aberto').length,
    'em-analise': all.filter(c => c.status === 'em-analise').length,
    resolvido: all.filter(c => c.status === 'resolvido').length,
    fechado: all.filter(c => c.status === 'fechado').length,
    criticos: all.filter(c => c.severidade === 'critica' && c.status !== 'fechado' && c.status !== 'resolvido').length,
  };

  const sel = selecionado ? all.find(c => c.id === selecionado) : null;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Chamados de suporte</h1>
          <p className="page-sub">Gerenciamento de problemas, sugestões e melhorias reportadas pelos usuários</p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-sm" onClick={() => {
            const rows = [['ID', 'Título', 'Tipo', 'Severidade', 'Status', 'Aberto por', 'Criado em', 'Comentários']];
            list.forEach(c => rows.push([c.id, c.titulo, c.tipo, c.severidade, c.status, c.abertoPorId ?? '', c.criadoEm?.slice(0, 10), (c.comentarios || []).length]));
            exportCsv(rows, `chamados-${exportDate}.csv`);
            dispatch({type: 'refresh'});
          }}><Icon name="download" size={13}/> Exportar</button>
          <button type="button" className="btn btn-primary btn-sm"
            onClick={() => dispatch({ type: 'openModal', kind: 'novoChamado' })}>
            <Icon name="plus" size={13}/> Novo chamado
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid" style={{gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: 16}}>
        <button type="button" className="kpi" style={{cursor: 'pointer', textAlign: 'left', width: '100%'}} aria-label="Filtrar: Abertos" onClick={() => setStatusFilter('aberto')}>
          <div className="label">Abertos</div>
          <div className="value tnum" style={{color: 'var(--amber)'}}>{stats.aberto}</div>
          <div className="delta">aguardando triagem</div>
        </button>
        <button type="button" className="kpi" style={{cursor: 'pointer', textAlign: 'left', width: '100%'}} aria-label="Filtrar: Em análise" onClick={() => setStatusFilter('em-analise')}>
          <div className="label">Em análise</div>
          <div className="value tnum" style={{color: 'var(--accent)'}}>{stats['em-analise']}</div>
          <div className="delta">sendo trabalhados</div>
        </button>
        <button type="button" className="kpi" style={{cursor: 'pointer', textAlign: 'left', width: '100%'}} aria-label="Filtrar: Resolvidos" onClick={() => setStatusFilter('resolvido')}>
          <div className="label">Resolvidos</div>
          <div className="value tnum" style={{color: 'var(--green)'}}>{stats.resolvido}</div>
          <div className="delta">aguardando feedback</div>
        </button>
        <button type="button" className="kpi" style={{cursor: 'pointer', textAlign: 'left', width: '100%'}} aria-label="Filtrar: Fechados" onClick={() => setStatusFilter('fechado')}>
          <div className="label">Fechados</div>
          <div className="value tnum" style={{color: 'var(--text-3)'}}>{stats.fechado}</div>
          <div className="delta">no histórico</div>
        </button>
        <div className="kpi" style={{borderColor: stats.criticos > 0 ? 'var(--red)' : undefined}}>
          <div className="label">Críticos pendentes</div>
          <div className="value tnum" style={{color: stats.criticos > 0 ? 'var(--red)' : 'var(--text-3)'}}>{stats.criticos}</div>
          <div className="delta">{stats.criticos > 0 ? 'requerem atenção imediata' : 'tudo sob controle'}</div>
        </div>
      </div>

      <div style={{display: 'block'}}>
        {/* Lista de chamados */}
        <div className="card card-tight">
          <div className="toolbar">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="abertos">Abertos + em análise</option>
              <option value="aberto">Apenas abertos</option>
              <option value="em-analise">Apenas em análise</option>
              <option value="resolvido">Resolvidos</option>
              <option value="fechado">Fechados</option>
              <option value="fechados">Resolvidos + fechados</option>
              <option value="todos">Todos os status</option>
            </select>
            <select value={tipoFilter} onChange={e => setTipoFilter(e.target.value)}>
              <option value="todos">Todos os tipos</option>
              <option value="bug">🐛 Bug</option>
              <option value="feature">💡 Sugestão</option>
              <option value="ui">🎨 Interface</option>
              <option value="performance">⚡ Performance</option>
              <option value="conformidade">📋 Conformidade</option>
            </select>
            <select value={sevFilter} onChange={e => setSevFilter(e.target.value)}>
              <option value="todas">Todas severidades</option>
              <option value="critica">Crítica</option>
              <option value="alta">Alta</option>
              <option value="media">Média</option>
              <option value="baixa">Baixa</option>
            </select>
            <div className="input" style={{marginLeft: 'auto', minWidth: 200}}>
              <Icon name="search" size={14}/>
              <input aria-label="Buscar chamados" placeholder="Buscar por ID, título…" value={query} onChange={e => setQuery(e.target.value)}/>
            </div>
            <span className="filter-pill active">{list.length} chamado{list.length !== 1 ? 's' : ''}</span>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>ID</th><th>Título</th><th>Tipo</th>
                <th>Severidade</th><th>Status</th>
                <th>Aberto por</th><th>Criado</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr><td colSpan={7} style={{padding: '30px 16px', textAlign: 'center', color: 'var(--text-3)'}}>
                  Nenhum chamado encontrado com os filtros atuais.
                </td></tr>
              ) : list.map(c => (
                <tr key={c.id} className={c.id === selecionado ? 'selected' : ''} onClick={() => setSelecionado(c.id)}>
                  <td className="num">{c.id}</td>
                  <td>
                    <div style={{fontSize: 12.5}}>{c.titulo}</div>
                    {c.comentarios && c.comentarios.length > 0 && (
                      <div style={{fontSize: 12, color: 'var(--text-3)', marginTop: 2, display: 'flex', gap: 4, alignItems: 'center'}}>
                        <Icon name="chat" size={10}/> {c.comentarios.length} comentário{c.comentarios.length > 1 ? 's' : ''}
                      </div>
                    )}
                  </td>
                  <td className="small">{tipoChamado(c.tipo)}</td>
                  <td>{sevChamado(c.severidade)}</td>
                  <td>{statusChamado(c.status)}</td>
                  <td className="small">{c.abertoPorId ?? ''}</td>
                  <td className="mono small">{c.criadoEm?.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Drawer de detalhes */}
        {sel && <ChamadoDetail chamado={sel} onClose={() => setSelecionado(null)} dispatch={dispatch}/>}
      </div>
    </>
  );
}
