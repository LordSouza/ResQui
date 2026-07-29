import { useEffect, useMemo, useReducer } from 'react';
import { Icon, Badge, Tag } from '../components';
import { PERMISSION_GROUPS, ROLES } from '../data';
import { exportCsv } from '../utils';
import { useUsuarios } from '../usuarios/useUsuarios';
import { useAlterarPapel } from '../usuarios/useAlterarPapel';
import { useAuth } from '../auth/AuthContext';

// ============== Helpers ==============

const papelBadge = (p) => {
  const r = ROLES[p];
  if (!r) return <Badge kind="gray">{p}</Badge>;
  return <span className="role-pill" style={{'--role-c': r.cor}}>{r.label}</span>;
};

const statusUsuarioBadge = (s) => {
  if (s === 'ativo')     return <Badge kind="green" dot>Ativo</Badge>;
  if (s === 'pendente')  return <Badge kind="amber" dot>Pendente</Badge>;
  if (s === 'arquivado') return <Badge kind="gray" dot>Arquivado</Badge>;
  return <Badge kind="gray">{s}</Badge>;
};

// ============== Drawer de permissões ==============

function drawerReducer(state, action) {
  switch (action.type) {
    case 'setPapel':
      return { ...state, papel: action.papel, dirty: true };
    default:
      return state;
  }
}

export function PermissoesDrawer({ usuario, onClose, dispatch }) {
  const alterarPapel = useAlterarPapel();
  const [drawerState, drawerDispatch] = useReducer(drawerReducer, null, () => ({
    papel: usuario.papel,
    dirty: false,
  }));
  const { papel, dirty } = drawerState;

  const onPapelChange = (p) => drawerDispatch({ type: 'setPapel', papel: p });

  const salvar = () => {
    alterarPapel.mutate(
      { id: usuario.id, NovoPapel: papel },
      {
        onSuccess: () => {
          dispatch({ type: 'refresh' });
          onClose();
        },
      }
    );
  };

  return (
    <button type="button" className="drawer-backdrop" onClick={onClose} aria-label="Fechar painel de permissões">
      <div className="drawer" role="dialog" tabIndex={-1} onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}>
        <div className="drawer-h">
          <div className="row" style={{gap: 12, alignItems: 'center'}}>
            <span className="avatar avatar-lg" style={{background: usuario.cor}}>{usuario.iniciais}</span>
            <div>
              <div className="drawer-title">{usuario.nome}</div>
              <div className="drawer-sub mono">{usuario.email}</div>
              <div style={{marginTop: 4, display: 'flex', gap: 6, alignItems: 'center'}}>
                {statusUsuarioBadge(usuario.status)}
                <span className="mono small muted">{usuario.id} · matrícula {usuario.matricula}</span>
              </div>
            </div>
          </div>
          <button type="button" className="close" onClick={onClose}><Icon name="close" size={16}/></button>
        </div>

        <div className="drawer-body">
          {/* Papel */}
          <div className="drawer-section">
            <div className="drawer-section-h">
              <div>
                <h4>Papel</h4>
                <div className="small muted">Define o conjunto de permissões concedidas pelo papel.</div>
              </div>
            </div>
            <div className="role-grid">
              {Object.entries(ROLES).map(([k, r]) => (
                <label key={k} className={`role-card ${papel === k ? 'sel' : ''}`} style={{'--role-c': r.cor}}>
                  <input type="radio" name="papel" aria-label={r.label} checked={papel === k} onChange={() => onPapelChange(k)}/>
                  <div className="role-card-h">
                    <span className="role-dot" style={{background: r.cor}}/>
                    <span className="role-name">{r.label}</span>
                  </div>
                  <div className="role-desc">{r.desc}</div>
                  <div className="role-foot mono">{r.perms.length} permissões</div>
                </label>
              ))}
            </div>
          </div>

          {/* Permissões do papel (read-only) */}
          <div className="drawer-section">
            <div className="drawer-section-h">
              <div>
                <h4>Permissões do papel</h4>
                <div className="small muted">
                  Concedidas automaticamente pelo papel <b>{ROLES[papel]?.label ?? papel}</b>. A autorização do sistema é por papel.
                </div>
              </div>
              <span className="badge gray mono">{(ROLES[papel]?.perms ?? []).length} permissões</span>
            </div>

            <div className="perm-list">
              {PERMISSION_GROUPS.map(g => {
                const rolePerms = new Set(ROLES[papel]?.perms ?? []);
                const granted = g.items.filter(([k]) => rolePerms.has(k));
                if (granted.length === 0) return null;
                return (
                  <div key={g.id} className="perm-group">
                    <div className="perm-group-h">
                      <div className="row" style={{gap: 8, alignItems: 'center'}}>
                        <span className="perm-icon"><Icon name={g.icon} size={14}/></span>
                        <span className="perm-group-name">{g.label}</span>
                        <span className="badge gray mono small">{granted.length}/{g.items.length}</span>
                      </div>
                    </div>
                    <div className="perm-items">
                      {granted.map(([k, label]) => (
                        <div key={k} className="perm-item on">
                          <span className="check-box"><Icon name="check" size={11}/></span>
                          <span className="perm-label">{label}</span>
                          <span className="perm-key mono">{k}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="drawer-foot">
          <div className="small muted">
            {dirty ? 'Papel alterado — salve para aplicar.' : 'Sem alterações pendentes.'}
          </div>
          <div className="row" style={{gap: 8}}>
            <button type="button" className="btn btn-sm" onClick={onClose}>Cancelar</button>
            <button type="button" className="btn btn-primary btn-sm" disabled={!dirty || alterarPapel.isPending} onClick={salvar}>
              <Icon name="check" size={12}/> {alterarPapel.isPending ? 'Salvando…' : 'Salvar alterações'}
            </button>
          </div>
        </div>
      </div>
    </button>
  );
}

// ============== Tela principal ==============

function screenReducer(s, a) {
  switch (a.type) {
    case 'setFilter':      return { ...s, filter: a.value };
    case 'setPapelFilter': return { ...s, papelFilter: a.value };
    case 'setBusca':       return { ...s, busca: a.value };
    case 'setSelecionado': return { ...s, selecionado: a.value };
    case 'setMenuOpen':    return { ...s, menuOpen: a.value };
    default: return s;
  }
}

export function UsuariosScreen({ state, dispatch }) {
  const [screen, screenDispatch] = useReducer(screenReducer, {
    filter: 'ativos',
    papelFilter: 'todos',
    busca: '',
    selecionado: null,
    menuOpen: null,
  });
  const { filter, papelFilter, busca, selecionado, menuOpen } = screen;
  const setFilter      = (value) => screenDispatch({ type: 'setFilter', value });
  const setPapelFilter = (value) => screenDispatch({ type: 'setPapelFilter', value });
  const setBusca       = (value) => screenDispatch({ type: 'setBusca', value });
  const setSelecionado = (value) => screenDispatch({ type: 'setSelecionado', value });
  const setMenuOpen    = (value) => screenDispatch({ type: 'setMenuOpen', value });

  const { user: usuarioLogado } = useAuth();
  const souAdmin = usuarioLogado?.papel === 'Admin';

  // Timestamp for export filename (stable per render cycle)
  const exportDate = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Fechar menu ao clicar fora
  useEffect(() => {
    const close = () => setMenuOpen(null);
    if (menuOpen) {
      const t = setTimeout(() => window.addEventListener('click', close, { once: true }), 0);
      return () => { clearTimeout(t); window.removeEventListener('click', close); };
    }
  }, [menuOpen]);

  const { data: todos = [], isPending, isError, refetch } = useUsuarios();

  let list = todos;
  if (filter === 'ativos')     list = list.filter(u => u.status === 'ativo');
  if (filter === 'pendentes')  list = list.filter(u => u.status === 'pendente');
  if (filter === 'arquivados') list = list.filter(u => u.status === 'arquivado');
  if (papelFilter !== 'todos') list = list.filter(u => u.papel === papelFilter);
  if (busca.trim()) {
    const q = busca.toLowerCase();
    list = list.filter(u =>
      u.nome.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.matricula || '').toLowerCase().includes(q)
    );
  }

  const counts = {
    todos: todos.length,
    ativos: todos.filter(u => u.status === 'ativo').length,
    pendentes: todos.filter(u => u.status === 'pendente').length,
    arquivados: todos.filter(u => u.status === 'arquivado').length,
  };

  const userSelecionado = selecionado ? todos.find(u => u.id === selecionado) : null;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Usuários e permissões</h1>
          <p className="page-sub">Controle de acesso por papel, laboratório e operação · {counts.ativos} ativos · {counts.pendentes} pendente · {counts.arquivados} arquivados</p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-sm" onClick={() => {
            const rows = [['ID', 'Nome', 'E-mail', 'Matrícula', 'Papel', 'Laboratórios', 'Status', 'Último acesso', 'Permissões customizadas']];
            todos.forEach(u => rows.push([u.id, u.nome, u.email, u.matricula, u.papel, (u.labs ?? []).join(';'), u.status, u.ultimo_acesso || '', u.perms ? 'sim' : 'não']));
            exportCsv(rows, `usuarios-${exportDate}.csv`);
            dispatch({type: 'refresh'});
          }}><Icon name="download" size={13}/> Exportar lista</button>
          <button type="button" className="btn btn-sm"><Icon name="upload" size={13}/> Importar CSV</button>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => dispatch({type: 'openModal', kind: 'novoUsuario'})}>
            <Icon name="plus" size={13}/> Novo usuário
          </button>
        </div>
      </div>

      {isPending && <div className="page-loading"><Icon name="refresh" size={16}/> Carregando...</div>}
      {isError && <div className="page-error">Erro ao carregar usuários. <button onClick={refetch}>Tentar novamente</button></div>}

      {!isPending && !isError && (<>
        {/* KPIs por papel */}
        <div className="kpi-grid" style={{gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 16}}>
          {Object.entries(ROLES).map(([k, r]) => {
            const n = todos.filter(u => u.papel === k && u.status === 'ativo').length;
            return (
              <button type="button" key={k} className="kpi" style={{cursor: 'pointer', textAlign: 'left', width: '100%'}} aria-label={`Filtrar por papel ${r.label}`} onClick={() => { setPapelFilter(papelFilter === k ? 'todos' : k); setFilter('ativos'); }}>
                <div className="kpi-stripe" style={{background: r.cor}}/>
                <div className="label">{r.label}</div>
                <div className="value tnum">{n}</div>
                <div className="delta">{r.perms.length} permissões padrão</div>
              </button>
            );
          })}
        </div>

        <div className="card card-tight">
          <div className="toolbar">
            {[
              ['ativos', 'Ativos', counts.ativos],
              ['pendentes', 'Pendentes', counts.pendentes],
              ['arquivados', 'Arquivados', counts.arquivados],
              ['todos', 'Todos', counts.todos],
            ].map(([k, l, c]) => (
              <button type="button" key={k} className={`filter-pill ${filter === k ? 'active' : ''}`}
                onClick={() => setFilter(k)} aria-pressed={filter === k}>
                {l} <span className="mono small">{c}</span>
              </button>
            ))}
            <span className="sep-v"/>
            <select aria-label="Filtrar por papel" value={papelFilter} onChange={e => setPapelFilter(e.target.value)}>
              <option value="todos">Todos os papéis</option>
              {Object.entries(ROLES).map(([k, r]) => <option key={k} value={k}>{r.label}</option>)}
            </select>
            <div className="input" style={{marginLeft: 'auto'}}>
              <Icon name="search" size={14}/>
              <input aria-label="Buscar usuários" placeholder="Buscar por nome, e-mail ou matrícula…" value={busca} onChange={e => setBusca(e.target.value)}/>
            </div>
          </div>

          {list.length === 0 ? (
            <div className="empty">Nenhum usuário corresponde aos filtros aplicados.</div>
          ) : (
            <table className="tbl tbl-usuarios">
              <thead>
                <tr>
                  <th>Usuário</th>
                  <th>Matrícula</th>
                  <th>Papel</th>
                  <th>Laboratórios</th>
                  <th>MFA</th>
                  <th>Último acesso</th>
                  <th>Status</th>
                  <th className="narrow" aria-label="Ações"></th>
                </tr>
              </thead>
              <tbody>
                {list.map(u => (
                  <tr key={u.id} className={selecionado === u.id ? 'selected' : ''}
                    onClick={() => setSelecionado(u.id)}>
                    <td>
                      <div className="user-cell">
                        <span className="avatar avatar-md" style={{background: u.cor}}>{u.iniciais}</span>
                        <div style={{minWidth: 0}}>
                          <div className="user-name">
                            {u.nome}
                            {u.voce && <span className="tag" style={{marginLeft: 6, background: 'var(--accent-soft)', color: 'var(--accent)', borderColor: 'var(--accent-soft-2)'}}>você</span>}
                            {u.externo && <span className="tag" style={{marginLeft: 6}}>externo</span>}
                          </div>
                          <div className="user-mail mono">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="mono small muted">{u.matricula}</td>
                    <td>{papelBadge(u.papel)}</td>
                    <td>
                      {u.labs?.includes('*')
                        ? <Tag>todos os labs</Tag>
                        : (u.labs ?? []).map(l => <Tag key={l}>{l}</Tag>)}
                    </td>
                    <td>{u.mfa
                      ? <Badge kind="green">TOTP</Badge>
                      : <span className="muted small">—</span>}</td>
                    <td className="mono small muted">{u.ultimo_acesso || <span className="muted">—</span>}</td>
                    <td>{statusUsuarioBadge(u.status)}</td>
                    <td className="narrow">
                      <div className="row-menu-wrap">
                        <button type="button" className="btn btn-sm btn-ghost" aria-label="Opções do usuário" onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen === u.id ? null : u.id); }}>
                          <Icon name="settings" size={13}/>
                        </button>
                        {menuOpen === u.id && (
                          <div className="row-menu" onClick={e => e.stopPropagation()}>
                            <button type="button" onClick={() => { setSelecionado(u.id); setMenuOpen(null); }}>
                              <Icon name="shield" size={12}/> Editar permissões
                            </button>
                            {u.status === 'ativo' && (
                              <button type="button" onClick={() => { dispatch({type: 'openModal', kind: 'arquivarUsuario', usuario: u}); setMenuOpen(null); }}>
                                <Icon name="book" size={12}/> Arquivar
                              </button>
                            )}
                            {souAdmin && u.mfa && u.id !== usuarioLogado?.id && (
                              <button type="button" onClick={() => { dispatch({type: 'openModal', kind: 'resetar2fa', usuario: u}); setMenuOpen(null); }}>
                                <Icon name="shield" size={12}/> Resetar 2FA
                              </button>
                            )}
                            <div className="row-menu-sep"/>
                            <button type="button" className="danger" disabled={u.voce}
                              onClick={() => { dispatch({type: 'openModal', kind: 'excluirUsuario', usuario: u}); setMenuOpen(null); }}>
                              <Icon name="trash" size={12}/> Excluir definitivamente
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </>)}

      {/* Side drawer com permissões do usuário */}
      {userSelecionado && (
        <PermissoesDrawer
          usuario={userSelecionado}
          onClose={() => setSelecionado(null)}
          dispatch={dispatch}
        />
      )}
    </>
  );
}
