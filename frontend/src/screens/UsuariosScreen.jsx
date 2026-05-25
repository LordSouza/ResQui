import { useEffect, useMemo, useReducer } from 'react';
import { Icon, Badge, Tag } from '../components';
import { LABORATORIOS, AUDITORIA, PERMISSION_GROUPS, ALL_PERMS, ROLES, USUARIOS } from '../data';
import { pgrsTs, exportCsv } from '../utils';

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

const effectivePerms = (u) => u.perms || ROLES[u.papel].perms;

const logAuditUser = (who, what, where, detail, risk = 'low') => {
  AUDITORIA.unshift({
    ts: pgrsTs(),
    who, what, where, detail, risk,
  });
};

// ============== Drawer de permissões ==============

function drawerReducer(state, action) {
  switch (action.type) {
    case 'setPapel': {
      const newPerms = !state.custom ? new Set(ROLES[action.papel].perms) : state.perms;
      return { ...state, papel: action.papel, perms: newPerms, dirty: true };
    }
    case 'togglePerm': {
      const n = new Set(state.perms);
      if (n.has(action.key)) n.delete(action.key); else n.add(action.key);
      return { ...state, perms: n, custom: true, dirty: true };
    }
    case 'toggleGroup': {
      const n = new Set(state.perms);
      action.group.items.forEach(([k]) => action.on ? n.add(k) : n.delete(k));
      return { ...state, perms: n, custom: true, dirty: true };
    }
    case 'resetParaPapel':
      return { ...state, perms: new Set(ROLES[state.papel].perms), custom: false, dirty: true };
    case 'toggleLab': {
      const { labs } = state;
      const newLabs = labs.includes('*') ? [action.id]
        : labs.includes(action.id) ? labs.filter(x => x !== action.id)
        : [...labs, action.id];
      return { ...state, labs: newLabs, dirty: true };
    }
    case 'setAllLabs':
      return { ...state, labs: action.all ? ['*'] : [], dirty: true };
    default:
      return state;
  }
}

function PermissoesDrawer({ usuario, onClose, dispatch }) {
  const [drawerState, drawerDispatch] = useReducer(drawerReducer, null, () => ({
    papel: usuario.papel,
    labs: usuario.labs,
    perms: new Set(effectivePerms(usuario)),
    custom: !!usuario.perms,
    dirty: false,
  }));
  const { papel, labs, perms, custom, dirty } = drawerState;

  // Quando papel muda, recarrega permissões do papel (a menos que esteja em modo custom)
  const onPapelChange = (p) => drawerDispatch({ type: 'setPapel', papel: p });
  const toggle = (k) => drawerDispatch({ type: 'togglePerm', key: k });
  const toggleGroup = (group, on) => drawerDispatch({ type: 'toggleGroup', group, on });
  const resetParaPapel = () => drawerDispatch({ type: 'resetParaPapel' });
  const toggleLab = (id) => drawerDispatch({ type: 'toggleLab', id });
  const setAllLabs = (all) => drawerDispatch({ type: 'setAllLabs', all });

  const salvar = () => {
    usuario.papel = papel;
    usuario.labs = labs.length ? labs : ['*'];
    usuario.perms = custom ? Array.from(perms) : null;
    logAuditUser('Lucas Souza', 'user.perms.update', 'Sistema/Usuários',
      `Atualizou permissões de ${usuario.nome} (${usuario.id}) · papel=${papel}${custom ? ' · custom' : ''}`, 'med');
    dispatch({type: 'refresh', flashId: usuario.id});
    onClose();
  };

  const totalPerms = perms.size;
  const papelPerms = new Set(ROLES[papel].perms);
  const divergente = custom && (
    Array.from(perms).some(p => !papelPerms.has(p)) ||
    Array.from(papelPerms).some(p => !perms.has(p))
  );

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
                <div className="small muted">Define o conjunto padrão de permissões. Você pode customizar abaixo.</div>
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

          {/* Laboratórios */}
          <div className="drawer-section">
            <div className="drawer-section-h">
              <div>
                <h4>Escopo de laboratórios</h4>
                <div className="small muted">O que este usuário consegue ver na navegação e nos relatórios.</div>
              </div>
              <div className="row" style={{gap: 6}}>
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => setAllLabs(true)}>Todos</button>
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => setAllLabs(false)}>Nenhum</button>
              </div>
            </div>
            <div className="lab-chip-grid">
              <label className={`lab-chip ${labs.includes('*') ? 'sel' : ''}`}>
                <input type="checkbox" aria-label="Todos os laboratórios" checked={labs.includes('*')} onChange={() => setAllLabs(!labs.includes('*'))}/>
                <Icon name="dashboard" size={13}/>
                <span>Todos os laboratórios</span>
              </label>
              {LABORATORIOS.map(l => {
                const on = labs.includes('*') || labs.includes(l.id);
                return (
                  <label key={l.id} className={`lab-chip ${on ? 'sel' : ''} ${labs.includes('*') ? 'forced' : ''}`}>
                    <input type="checkbox" aria-label={l.nome} disabled={labs.includes('*')} checked={on} onChange={() => toggleLab(l.id)}/>
                    <span className="lab-color" style={{background: l.cor}}/>
                    <span style={{minWidth: 0}}>
                      <span style={{display: 'block', fontWeight: 500, fontSize: 12}}>{l.id}</span>
                      <span className="small muted" style={{display: 'block'}}>{l.nome}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Permissões */}
          <div className="drawer-section">
            <div className="drawer-section-h">
              <div>
                <h4>Permissões efetivas</h4>
                <div className="small muted">
                  {custom
                    ? <>Permissões customizadas · <button type="button" className="link" onClick={resetParaPapel}>restaurar padrão do papel</button></>
                    : <>Usando padrão do papel <b>{ROLES[papel].label}</b></>}
                </div>
              </div>
              <span className="badge gray mono">{totalPerms} / {ALL_PERMS.length}</span>
            </div>

            <div className="perm-list">
              {PERMISSION_GROUPS.map(g => {
                const total = g.items.length;
                const sel = g.items.filter(([k]) => perms.has(k)).length;
                const allOn = sel === total;
                return (
                  <div key={g.id} className="perm-group">
                    <div className="perm-group-h">
                      <div className="row" style={{gap: 8, alignItems: 'center'}}>
                        <span className="perm-icon"><Icon name={g.icon} size={14}/></span>
                        <span className="perm-group-name">{g.label}</span>
                        <span className="badge gray mono small">{sel}/{total}</span>
                      </div>
                      <label className="bulk-toggle">
                        <input type="checkbox" aria-label={`Ativar todas as permissões de ${g.label}`} checked={allOn} onChange={e => toggleGroup(g, e.target.checked)}/>
                        <span>tudo</span>
                      </label>
                    </div>
                    <div className="perm-items">
                      {g.items.map(([k, label]) => {
                        const on = perms.has(k);
                        const fromRole = ROLES[papel].perms.includes(k);
                        return (
                          <label key={k} className={`perm-item ${on ? 'on' : ''}`}>
                            <input type="checkbox" aria-label={label} checked={on} onChange={() => toggle(k)}/>
                            <span className="check-box"><Icon name="check" size={11}/></span>
                            <span className="perm-label">{label}</span>
                            <span className="perm-key mono">{k}</span>
                            {on && !fromRole && <span className="badge amber mono small" title="Permissão concedida além do papel">extra</span>}
                            {!on && fromRole && <span className="badge gray mono small" title="Removida em relação ao papel">−</span>}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Histórico curto */}
          <div className="drawer-section">
            <div className="drawer-section-h">
              <div><h4>Atividade recente</h4></div>
            </div>
            <div className="user-activity">
              {(AUDITORIA.filter(a => a.who === usuario.nome.replace(/^(Profa?\.|Téc\.)\s*/, '')).slice(0, 4)).map((a) => (
                <div key={`${a.ts}|${a.what}`} className="activity-row">
                  <span className="mono small muted" style={{width: 130}}>{a.ts}</span>
                  <span className="tag" style={{marginRight: 8}}>{a.what}</span>
                  <span className="small">{a.detail}</span>
                </div>
              ))}
              {AUDITORIA.filter(a => a.who === usuario.nome.replace(/^(Profa?\.|Téc\.)\s*/, '')).length === 0 && (
                <div className="small muted" style={{padding: '8px 0'}}>Sem registros de atividade no período.</div>
              )}
            </div>
          </div>
        </div>

        <div className="drawer-foot">
          <div className="small muted">
            {divergente
              ? <span><Icon name="warning" size={11}/> Permissões divergem do papel {ROLES[papel].label}</span>
              : 'Sem alterações pendentes do papel.'}
          </div>
          <div className="row" style={{gap: 8}}>
            <button type="button" className="btn btn-sm" onClick={onClose}>Cancelar</button>
            <button type="button" className="btn btn-primary btn-sm" disabled={!dirty} onClick={salvar}>
              <Icon name="check" size={12}/> Salvar alterações
            </button>
          </div>
        </div>
      </div>
    </button>
  );
}

// ============== Ações simples ==============

function restaurarUsuario(u, dispatch) {
  u.status = 'ativo';
  delete u.arquivado;
  logAuditUser('Lucas Souza', 'user.restore', 'Sistema/Usuários',
    `Restaurou usuário ${u.nome} (${u.id})`, 'low');
  dispatch({type: 'refresh', flashId: u.id});
}

function reenviarConvite(u, dispatch) {
  logAuditUser('Lucas Souza', 'user.invite.resend', 'Sistema/Usuários',
    `Reenviou convite de acesso para ${u.email}`, 'low');
  dispatch({type: 'refresh', flashId: u.id});
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

  const todos = USUARIOS;
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

  const userSelecionado = selecionado ? USUARIOS.find(u => u.id === selecionado) : null;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Usuários e permissões</h1>
          <p className="page-sub">Controle de acesso por papel, laboratório e operação · {counts.ativos} ativos · {counts.pendentes} pendente · {counts.arquivados} arquivados</p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-sm" onClick={() => {
            const rows = [['ID', 'Nome', 'E-mail', 'Matrícula', 'Papel', 'Laboratórios', 'Status', 'Último acesso', 'MFA', 'Permissões customizadas']];
            todos.forEach(u => rows.push([u.id, u.nome, u.email, u.matricula, u.papel, (u.labs || []).join(';'), u.status, u.ultimo_acesso || '', u.mfa ? 'sim' : 'não', u.perms ? 'sim' : 'não']));
            exportCsv(rows, `usuarios-${exportDate}.csv`);
            logAuditUser('Lucas Souza', 'user.export', 'Sistema/Usuários', `Exportou lista de usuários (${todos.length} itens)`, 'low');
            dispatch({type: 'refresh'});
          }}><Icon name="download" size={13}/> Exportar lista</button>
          <button type="button" className="btn btn-sm"><Icon name="upload" size={13}/> Importar CSV</button>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => dispatch({type: 'openModal', kind: 'novoUsuario'})}>
            <Icon name="plus" size={13}/> Novo usuário
          </button>
        </div>
      </div>

      {/* KPIs por papel */}
      <div className="kpi-grid" style={{gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: 16}}>
        {Object.entries(ROLES).map(([k, r]) => {
          const n = todos.filter(u => u.papel === k && u.status === 'ativo').length;
          return (
            <button type="button" key={k} className="kpi" style={{cursor: 'pointer', textAlign: 'left', width: '100%'}} aria-label={`Filtrar por papel ${r.label}`} onClick={() => { setPapelFilter(papelFilter === k ? 'todos' : k); setFilter('ativos'); }}>
              <div className="kpi-stripe" style={{background: r.cor}}/>
              <div className="label">{r.label}</div>
              <div className="value tnum">{n}</div>
              <div className="delta">{ROLES[k].perms.length} permissões padrão</div>
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
                    {u.labs.includes('*')
                      ? <Tag>todos os labs</Tag>
                      : u.labs.map(l => <Tag key={l}>{l}</Tag>)}
                  </td>
                  <td>
                    {u.mfa
                      ? <span className="mfa-on" title="2FA ativo"><Icon name="shield" size={13}/></span>
                      : <span className="mfa-off mono small" title="2FA inativo">off</span>}
                  </td>
                  <td className="mono small muted">{u.ultimo_acesso || <span className="muted">(sem acesso)</span>}</td>
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
                          {u.status === 'arquivado' && (
                            <button type="button" onClick={() => { restaurarUsuario(u, dispatch); setMenuOpen(null); }}>
                              <Icon name="refresh" size={12}/> Restaurar
                            </button>
                          )}
                          {u.status === 'pendente' && (
                            <button type="button" onClick={() => { reenviarConvite(u, dispatch); setMenuOpen(null); }}>
                              <Icon name="send" size={12}/> Reenviar convite
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
