// App shell — sidebar, topbar, router
import { useState, useEffect, useReducer, useRef } from 'react';

import { useAuth } from './auth/AuthContext';
import { useSessoes } from './auth/useSeguranca';
import { useNotificacoes } from './notificacoes/useNotificacoes';
import { useResíduos } from './residuos/useResíduos';
import { useMarcarLida } from './notificacoes/useMarcarLida';
import { useMarcarTodasLidas } from './notificacoes/useMarcarTodasLidas';
import { pgrsTs, exportCsv, iniciaisUsuario } from './utils';
import { Icon, Badge, Tag, Picto, SectionTitle, Empty, validadeBadge, riscoBadge, residuoStatusBadge } from './components';
import { BuscaGlobal } from './components/BuscaGlobal';
import { reducer, initialState } from './store/reducer';
import { useAtalhosGlobais } from './lib/useAtalhosGlobais';

import { DashboardScreen } from './screens/DashboardScreen';
import { InventarioScreen } from './screens/InventarioScreen';
import { DetalheScreen } from './screens/DetalheScreen';
import { CompatScreen } from './screens/CompatScreen';
import { ResiduosScreen } from './screens/ResiduosScreen';
import { MtrScreen } from './screens/MtrScreen';
import { AuditoriaScreen } from './screens/AuditoriaScreen';
import { RelatoriosScreen } from './screens/RelatoriosScreen';
import { LaboratoriosScreen } from './screens/LaboratoriosScreen';
import { UsuariosScreen } from './screens/UsuariosScreen';
import { ChamadosScreen } from './screens/ChamadosScreen';

import { AssistenteChat } from './chat/AssistenteChat';

import { FormNovoReagente, FormImportarCSV, FormEditarRegrasCompat, FormBaixa, FormTransferirReagente } from './forms/reagentes';
import { ResumoSeguranca } from './forms/ResumoSeguranca';
import { FormNovoResiduo, FormEditarResiduo, ConfirmRejeitarResiduo, FormNovoMtr, FormConfigurarPgrs } from './forms/residuos';
import { FormNovoLab, ConfirmRemoverLab, FormEditarLaboratorio } from './forms/laboratorios';
import { FormNovoUsuario, ConfirmArquivarUsuario, ConfirmExcluirUsuario, ConfirmResetar2fa } from './forms/usuarios';
import { FormPerfil, FormSenha2FA, FormSessoes, FormNotificacoes, FormReportar } from './forms/sistema';
import { FormNovoChamado } from './forms/chamados';
import { FormEditarReagente } from './forms/FormEditarReagente';

import { LoginScreen } from './Login';
import { podeVerTela, motivoTelaRestrita } from './auth/permissoes';
import { useIdentificacaoPgrs } from './pgrs/useIdentificacaoPgrs';

// Renderizada no lugar de uma tela cujo papel do usuário não alcança. Não é segurança — a
// autorização é do servidor —, é para não mostrar uma tela que só saberia exibir erro de carga.
function AcessoRestrito({ state }) {
  return (
    <div className="page-error">
      <b>Acesso restrito.</b> {motivoTelaRestrita(state?.screen)}
    </div>
  );
}

const NAV = [
  { key: 'dashboard', label: 'Início', icon: 'dashboard' },
  { key: 'inventario', label: 'Inventário', icon: 'flask' },
  { key: 'residuos', label: 'Resíduos', icon: 'trash' },
  { key: 'compat', label: 'Compatibilidade', icon: 'shield' },
  { key: 'mtr', label: 'Manifestos', icon: 'truck', section: 'gestao' },
  { key: 'laboratorios', label: 'Laboratórios', icon: 'location', section: 'gestao' },
  { key: 'relatorios', label: 'Relatórios', icon: 'file_chart', section: 'gestao' },
  { key: 'auditoria', label: 'Auditoria', icon: 'audit', section: 'gestao' },
  { key: 'usuarios', label: 'Usuários', icon: 'clipboard', section: 'gestao' },
  { key: 'chamados', label: 'Chamados', icon: 'warning', section: 'sistema' },
];

export function UserMenu({ user, onLogout, dispatch }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { data: sessoes = [] } = useSessoes();
  const numSessoes = sessoes.length;
  const nome = user?.nome ?? user?.email ?? '';

  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const openModal = (kind) => {
    setOpen(false);
    dispatch({ type: 'openModal', kind });
  };

  return (
    <div ref={ref} className="user-menu-wrap">
      <button type="button" onClick={() => setOpen(o => !o)} className={`user-menu-btn${open ? ' open' : ''}`}
        aria-label="Conta e preferências">
        <div className="avatar">{iniciaisUsuario(user)}</div>
        <div className="user-menu-btn-meta">
          <div className="who">{nome}</div>
          <div className="user-menu-btn-role mono">{user?.papel}</div>
        </div>
        <span className="user-menu-settings-icon" title="Conta e preferências">
          <Icon name="settings" size={14}/>
        </span>
      </button>

      {open && (
        <div className="user-menu-dropdown">
          {/* Header */}
          <div style={{padding: '10px 12px 8px', borderBottom: '1px solid var(--border)', marginBottom: 4}}>
            <div style={{fontSize: 13, fontWeight: 600, color: 'var(--text)'}}>{nome}</div>
            <div style={{fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--mono)', marginTop: 2}}>{user?.email}</div>
            <div style={{marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap'}}>
              <span style={umBadge}>{user?.papel}</span>
              {user?.twoFactorEnabled && <span style={umBadge}>2FA ativo</span>}
            </div>
          </div>

          {/* Conta */}
          <UmGroup label="Conta">
            <UmItem icon="clipboard" label="Perfil" hint="Editar nome e e-mail" onClick={() => openModal('perfil')}/>
            <UmItem icon="shield" label="Senha e 2FA" onClick={() => openModal('senha2fa')}/>
            <UmItem icon="audit" label="Sessões ativas" hint={`${numSessoes} ${numSessoes === 1 ? 'dispositivo' : 'dispositivos'}`} badge={String(numSessoes)} onClick={() => openModal('sessoes')}/>
          </UmGroup>

          {/* Preferências */}
          <UmGroup label="Preferências">
            <UmItem icon="bell" label="Notificações por e-mail" hint="Vencimento · MTR · Estoque" onClick={() => openModal('notificacoes')}/>
          </UmGroup>

          {/* Ajuda */}
          <UmGroup label="Ajuda">
            <UmItem icon="warning" label="Reportar problema" onClick={() => openModal('reportar')}/>
            <div style={{padding: '6px 12px', fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--mono)'}}>
              ResQui v{__APP_VERSION__}
            </div>
          </UmGroup>

          {/* Logout */}
          <div style={{borderTop: '1px solid var(--border)', paddingTop: 4, marginTop: 4}}>
            <button type="button" onClick={() => { setOpen(false); onLogout(); }}
              style={{...umItemStyle, color: 'var(--red)'}}>
              <Icon name="upload" size={13} stroke={1.8}/>
              <span style={{flex: 1, textAlign: 'left'}}>Sair da conta</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function UmGroup({ label, children }) {
  return (
    <div style={{padding: '4px 0', borderTop: '1px solid var(--border)', marginTop: 4}}>
      <div style={{padding: '6px 12px 2px', fontSize: 12, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)'}}>{label}</div>
      {children}
    </div>
  );
}
function UmItem({ icon, label, hint, badge, onClick }) {
  return (
    <button type="button" style={umItemStyle} onClick={onClick}>
      <Icon name={icon} size={13}/>
      <span style={{flex: 1, textAlign: 'left'}}>
        <div style={{fontSize: 12, color: 'var(--text)'}}>{label}</div>
        {hint && <div style={{fontSize: 12, color: 'var(--text-3)', marginTop: 1}}>{hint}</div>}
      </span>
      {badge && <span style={umBadge}>{badge}</span>}
    </button>
  );
}
const umItemStyle = {
  display: 'flex', alignItems: 'center', gap: 10, width: '100%',
  padding: '7px 12px', background: 'transparent', border: 0, cursor: 'pointer',
  borderRadius: 4, textAlign: 'left', color: 'var(--text)',
};
const umRow = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '6px 12px' };
const umLabel = { fontSize: 12, color: 'var(--text-2)' };
const umSegmented = { display: 'flex', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' };
const umSegBtn = { padding: '3px 8px', background: '#fff', border: 0, fontSize: 12, cursor: 'pointer', color: 'var(--text-2)', fontFamily: 'inherit' };
const umSegBtnActive = { background: 'var(--accent)', color: '#fff' };
const umBadge = {
  display: 'inline-block', padding: '1px 6px', background: 'var(--accent-soft)',
  color: 'var(--accent)', borderRadius: 4, fontSize: 12, fontFamily: 'var(--mono)',
  fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em',
};

function NotifBell({ dispatch, papel }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { data: notificacoes = [], isError } = useNotificacoes();
  const marcarLida = useMarcarLida();
  const marcarTodas = useMarcarTodasLidas();

  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    if (open) document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const naoLidas = notificacoes.filter(n => !n.lida).length;

  const iconePara = (tipo) => ({
    'expiry': 'warning', 'low-stock': 'flask',
    'compat': 'shield', 'coleta': 'clipboard',
  })[tipo] || 'bell';

  const navTarget = (n) => {
    if (n.tipo === 'expiry' || n.tipo === 'low-stock') return { screen: 'inventario' };
    if (n.tipo === 'compat') return { screen: 'compat' };
    if (n.tipo === 'coleta') return { screen: 'residuos' };
    return null;
  };

  const handleClick = (n) => {
    if (!n.lida) marcarLida.mutate(n.id);
    const target = navTarget(n);
    setOpen(false);
    if (target) dispatch({ type: 'nav', ...target });
  };

  const marcarTodasLidas = () => {
    marcarTodas.mutate();
    setOpen(false);
  };

  return (
    <div ref={ref} style={{position: 'relative'}}>
      <button type="button" className="topbar-btn" onClick={() => setOpen(o => !o)}
        aria-label="Notificações">
        <Icon name="bell" size={13}/>
        {naoLidas > 0 && <span className="notif-badge">{naoLidas}</span>}
        {naoLidas === 0 && <span className="notif-zero">0</span>}
      </button>

      {open && (
        <div className="notif-dropdown">
          <div style={{padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <div>
              <div style={{fontSize: 13, fontWeight: 600}}>Notificações</div>
              <div style={{fontSize: 12, color: 'var(--text-3)', marginTop: 1}}>
                {naoLidas > 0 ? `${naoLidas} não lida${naoLidas > 1 ? 's' : ''}` : 'Tudo em dia ✓'}
              </div>
            </div>
            {naoLidas > 0 && (
              <button type="button" onClick={marcarTodasLidas} style={{
                background: 'transparent', border: 0, color: 'var(--accent)',
                cursor: 'pointer', fontSize: 12, padding: 4,
              }}>Marcar todas como lidas</button>
            )}
          </div>

          <div style={{maxHeight: 380, overflowY: 'auto'}}>
            {isError && (
              <div style={{padding: '8px 14px', fontSize: 12, color: 'var(--red)'}}>
                Erro ao carregar notificações.
              </div>
            )}
            {!isError && notificacoes.length === 0 && (
              <div style={{padding: 30, textAlign: 'center', color: 'var(--text-3)', fontSize: 13}}>
                Nenhuma notificação ativa.
              </div>
            )}
            {notificacoes.map((n, i) => (
              <button type="button" key={n.id} onClick={() => handleClick(n)}
                className={`notif-item${n.lida ? '' : ' unread'}`}
                style={{borderTop: i ? '1px solid var(--border)' : 0}}>
                {!n.lida && <span className="notif-dot"/>}
                <div className={`notif-icon sev-${n.severidade === 'red' ? 'red' : n.severidade === 'amber' ? 'amber' : 'other'}`}>
                  <Icon name={iconePara(n.tipo)} size={14}/>
                </div>
                <div style={{flex: 1, minWidth: 0}}>
                  <div style={{fontSize: 12.5, fontWeight: n.lida ? 400 : 500, lineHeight: 1.4, color: 'var(--text)'}}>
                    {n.mensagem}
                  </div>
                  <div style={{fontSize: 12, color: 'var(--text-3)', marginTop: 3, display: 'flex', gap: 8, alignItems: 'center'}}>
                    <span style={{fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.04em'}}>{n.tipo}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div style={{padding: 8, borderTop: '1px solid var(--border)', display: 'flex', gap: 4}}>
            <button type="button" onClick={() => { setOpen(false); dispatch({ type: 'openModal', kind: 'notificacoes' }); }}
              style={notifFootBtn}>
              <Icon name="settings" size={12}/> Configurar
            </button>
            {podeVerTela(papel, 'auditoria') && (
              <button type="button" onClick={() => { setOpen(false); dispatch({ type: 'nav', screen: 'auditoria' }); }}
                style={notifFootBtn}>
                <Icon name="audit" size={12}/> Ver histórico
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
const notifFootBtn = {
  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  padding: '6px 10px', background: 'transparent', border: 0, cursor: 'pointer',
  fontSize: 12, color: 'var(--text-2)', borderRadius: 4,
};

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const buscaRef = useRef(null);
  const { user, token, logout } = useAuth();
  const { data: residuosNav = [] } = useResíduos({}, { enabled: !!token });
  const { data: identificacao } = useIdentificacaoPgrs({ enabled: !!token });
  const navBadges = {
    residuos: residuosNav.filter(r => r.status === 'aguardando-coleta').length,
  };

  useAtalhosGlobais({
    onBuscar: () => buscaRef.current?.focus(),
    onChat: () => dispatch({ type: state.chatOpen ? 'closeChat' : 'openChat' }),
  });

  // limpar flash após animação
  useEffect(() => {
    if (state.flashId) {
      const t = setTimeout(() => dispatch({type: 'refresh'}), 1700);
      return () => clearTimeout(t);
    }
  }, [state.flashId]);

  if (!user) {
    return <LoginScreen />;
  }

  // Esconder o item da sidebar não basta: state.screen pode chegar a uma tela restrita por outro
  // caminho (atalho, estado preservado). O render decide de novo, com a mesma regra — dentro do
  // shell, para que a sidebar continue disponível em vez de prender o usuário.
  const Screen = !podeVerTela(user?.papel, state.screen) ? AcessoRestrito : (() => {
    switch (state.screen) {
      case 'dashboard': return DashboardScreen;
      case 'laboratorios': return LaboratoriosScreen;
      case 'inventario': return InventarioScreen;
      case 'detalhe': return DetalheScreen;
      case 'compat': return CompatScreen;
      case 'residuos': return ResiduosScreen;
      case 'mtr': return MtrScreen;
      case 'auditoria': return AuditoriaScreen;
      case 'relatorios': return RelatoriosScreen;
      case 'usuarios': return UsuariosScreen;
      case 'chamados': return ChamadosScreen;
      default: return DashboardScreen;
    }
  })();

  const crumb = NAV.find(n => n.key === state.screen) || NAV[0];

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="logo">Rq</div>
          <div>
            <div className="brand-name">ResQui</div>
            {(identificacao?.unidade || identificacao?.razaoSocial) && (
              <div className="brand-sub">{identificacao.unidade || identificacao.razaoSocial}</div>
            )}
          </div>
        </div>

        <div className="sidebar-section" id="nav-secao-dia-a-dia">Dia a dia</div>
        <nav className="nav" aria-labelledby="nav-secao-dia-a-dia">
          {NAV.filter(n => !n.section).filter(n => podeVerTela(user?.papel, n.key)).map(n => (
            <button type="button" key={n.key} className={`nav-item ${state.screen === n.key || (n.key === 'inventario' && state.screen === 'detalhe') ? 'active' : ''}`}
              onClick={() => dispatch({type: 'nav', screen: n.key})}>
              <span className="nav-icon"><Icon name={n.icon} size={15}/></span>
              {n.label}
              {navBadges[n.key] > 0 && <span className="badge-count">{navBadges[n.key]}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-section" id="nav-secao-gestao">Gestão</div>
        <nav className="nav" aria-labelledby="nav-secao-gestao">
          {NAV.filter(n => n.section === 'gestao').filter(n => podeVerTela(user?.papel, n.key)).map(n => (
            <button type="button" key={n.key} className={`nav-item ${state.screen === n.key ? 'active' : ''}`}
              onClick={() => dispatch({type: 'nav', screen: n.key})}>
              <span className="nav-icon"><Icon name={n.icon} size={15}/></span>
              {n.label}
              {navBadges[n.key] > 0 && <span className="badge-count">{navBadges[n.key]}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-section" id="nav-secao-sistema">Sistema</div>
        <nav className="nav" aria-labelledby="nav-secao-sistema">
          {NAV.filter(n => n.section === 'sistema').filter(n => podeVerTela(user?.papel, n.key)).map(n => (
            <button type="button" key={n.key} className={`nav-item ${state.screen === n.key ? 'active' : ''}`}
              onClick={() => dispatch({type: 'nav', screen: n.key})}>
              <span className="nav-icon"><Icon name={n.icon} size={15}/></span>
              {n.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-section" style={{marginTop: 16}} id="nav-secao-assistente">Assistente</div>
        <nav className="nav" aria-labelledby="nav-secao-assistente">
          <button type="button" className="nav-item" onClick={() => dispatch({type: 'openChat'})}>
            <span className="nav-icon"><Icon name="sparkle" size={15}/></span>
            Assistente
            <span className="badge-count" style={{background: '#1465c0'}}>IA</span>
          </button>
        </nav>

        <div className="sidebar-foot">
          <UserMenu user={user} onLogout={logout} dispatch={dispatch}/>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="crumb">
            <span>ResQui</span>
            <Icon name="chevron_right" size={10}/>
            <span className="here">{crumb.label}</span>
            {state.screen === 'detalhe' && state.detailId && (
              <>
                <Icon name="chevron_right" size={10}/>
                <span className="here mono">{state.detailId}</span>
              </>
            )}
          </div>
          <BuscaGlobal dispatch={dispatch} inputRef={buscaRef}/>
          <NotifBell dispatch={dispatch} papel={user?.papel}/>
          <button type="button" className="topbar-btn" onClick={() => dispatch({type: 'openChat'})}>
            <Icon name="sparkle" size={13}/> IA
          </button>
        </header>

        <main className="page">
          <Screen state={state} dispatch={dispatch}/>
        </main>
      </div>

      <AssistenteChat state={state} dispatch={dispatch}/>

      {state.modal === 'novoReagente' && <FormNovoReagente onClose={() => dispatch({type: 'closeModal'})} dispatch={dispatch}/>}
      {state.modal === 'importarCsv' && <FormImportarCSV onClose={() => dispatch({type: 'closeModal'})} dispatch={dispatch}/>}
      {state.modal === 'editarRegrasCompat' && <FormEditarRegrasCompat onClose={() => dispatch({type: 'closeModal'})} dispatch={dispatch}/>}
      {state.modal === 'resumoSeguranca' && <ResumoSeguranca onClose={() => dispatch({type: 'closeModal'})} reagente={state.modalReagente}/>}
      {state.modal === 'configurarPgrs' && <FormConfigurarPgrs onClose={() => dispatch({type: 'closeModal'})}/>}
      {state.modal === 'perfil' && <FormPerfil onClose={() => dispatch({type: 'closeModal'})}/>}
      {state.modal === 'senha2fa' && <FormSenha2FA onClose={() => dispatch({type: 'closeModal'})} dispatch={dispatch}/>}
      {state.modal === 'sessoes' && <FormSessoes onClose={() => dispatch({type: 'closeModal'})} dispatch={dispatch}/>}
      {state.modal === 'notificacoes' && <FormNotificacoes onClose={() => dispatch({type: 'closeModal'})}/>}
      {state.modal === 'reportar' && <FormReportar onClose={() => dispatch({type: 'closeModal'})} dispatch={dispatch}/>}
      {state.modal === 'novoChamado' && <FormNovoChamado onClose={() => dispatch({type: 'closeModal'})} dispatch={dispatch}/>}
      {state.modal === 'novoResiduo' && <FormNovoResiduo inicial={state.modalResiduoInicial} onClose={() => dispatch({type: 'closeModal'})} dispatch={dispatch}/>}
      {state.modal === 'editarResiduo' && state.modalResiduo && <FormEditarResiduo residuo={state.modalResiduo} onClose={() => dispatch({type: 'closeModal'})} dispatch={dispatch}/>}
      {state.modal === 'rejeitarResiduo' && state.modalResiduo && <ConfirmRejeitarResiduo residuo={state.modalResiduo} onClose={() => dispatch({type: 'closeModal'})} dispatch={dispatch}/>}
      {state.modal === 'novoMtr' && <FormNovoMtr onClose={() => dispatch({type: 'closeModal'})} dispatch={dispatch}/>}
      {state.modal === 'baixa' && state.modalReagente && <FormBaixa reagente={state.modalReagente} quantidadeInicial={state.modalBaixaInicial?.quantidade} onClose={() => dispatch({type: 'closeModal'})} dispatch={dispatch}/>}
      {state.modal === 'transferirReagente' && state.modalReagente && <FormTransferirReagente reagente={state.modalReagente} onClose={() => dispatch({type: 'closeModal'})} dispatch={dispatch}/>}
      {state.modal === 'editarReagente' && state.modalReagente && (
        <FormEditarReagente
          reagente={state.modalReagente}
          onClose={() => dispatch({ type: 'closeModal' })}
          dispatch={dispatch}
        />
      )}
      {state.modal === 'novoLab' && <FormNovoLab onClose={() => dispatch({type: 'closeModal'})} dispatch={dispatch}/>}
      {state.modal === 'removerLab' && state.modalLab && <ConfirmRemoverLab lab={state.modalLab} onClose={() => dispatch({type: 'closeModal'})} dispatch={dispatch}/>}
      {state.modal === 'editarLab' && state.modalLab && (
        <FormEditarLaboratorio
          lab={state.modalLab}
          onClose={() => dispatch({ type: 'closeModal' })}
          dispatch={dispatch}
        />
      )}
      {state.modal === 'novoUsuario' && <FormNovoUsuario onClose={() => dispatch({type: 'closeModal'})} dispatch={dispatch}/>}
      {state.modal === 'arquivarUsuario' && state.modalUsuario && <ConfirmArquivarUsuario usuario={state.modalUsuario} onClose={() => dispatch({type: 'closeModal'})} dispatch={dispatch}/>}
      {state.modal === 'excluirUsuario' && state.modalUsuario && <ConfirmExcluirUsuario usuario={state.modalUsuario} onClose={() => dispatch({type: 'closeModal'})} dispatch={dispatch}/>}
      {state.modal === 'resetar2fa' && state.modalUsuario && <ConfirmResetar2fa usuario={state.modalUsuario} onClose={() => dispatch({type: 'closeModal'})} dispatch={dispatch}/>}
    </div>
  );
}
