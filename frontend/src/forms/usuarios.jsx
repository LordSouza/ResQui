import { useState } from 'react';
import { Icon, Badge } from '../components';
import { USUARIOS, LABORATORIOS, AUDITORIA, ROLES } from '../data';
import { pgrsTs } from '../utils';
import Modal from './Modal';
import ConfirmArquivarUsuario from './ConfirmArquivarUsuario';

const papelBadge = (p) => {
  const r = ROLES[p];
  if (!r) return <Badge kind="gray">{p}</Badge>;
  return <span className="role-pill" style={{'--role-c': r.cor}}>{r.label}</span>;
};

const logAuditUser = (who, what, where, detail, risk = 'low') => {
  AUDITORIA.unshift({
    ts: pgrsTs(),
    who, what, where, detail, risk,
  });
};

// ============== Modal: Novo usuário ==============

export function FormNovoUsuario({ onClose, dispatch }) {
  const [f, setF] = useState({
    nome: '', email: '', matricula: '', papel: 'pesquisador',
    labs: [], todosLabs: false, mfa: true, externo: false,
    enviarConvite: true,
  });
  const upd = (k, v) => setF(s => ({...s, [k]: v}));

  const toggleLab = (id) => {
    setF(s => ({
      ...s,
      labs: s.labs.includes(id) ? s.labs.filter(x => x !== id) : [...s.labs, id],
      todosLabs: false,
    }));
  };

  const submit = () => {
    if (!f.nome.trim() || !f.email.trim()) {
      alert('Nome e e-mail são obrigatórios.');
      return;
    }
    if (!f.todosLabs && f.labs.length === 0) {
      alert('Selecione ao menos um laboratório (ou marque "Todos os laboratórios").');
      return;
    }
    const parts = f.nome.trim().split(/\s+/);
    const iniciais = ((parts[0] || '')[0] + (parts[parts.length - 1] || '')[0] || '?').toUpperCase();
    const cores = ['#1465c0','#5b3c8c','#1f7a3e','#b76e00','#0d4a8c'];
    const id = 'U-' + String(USUARIOS.length + 1).padStart(3, '0');
    const novo = {
      id, nome: f.nome.trim(), email: f.email.trim(),
      matricula: f.matricula.trim() || '—',
      papel: f.papel,
      labs: f.todosLabs ? ['*'] : f.labs,
      status: f.enviarConvite ? 'pendente' : 'ativo',
      ultimo_acesso: null,
      criado: new Date().toISOString().slice(0, 10),
      mfa: f.mfa, perms: null,
      iniciais, cor: cores[USUARIOS.length % cores.length],
      externo: f.externo,
    };
    USUARIOS.unshift(novo);
    logAuditUser('Lucas Souza', 'user.create', 'Sistema/Usuários',
      `Cadastrou usuário ${novo.nome} (${novo.id}) · papel=${f.papel}${f.enviarConvite ? ' · convite enviado' : ''}`, 'med');
    dispatch({type: 'refresh', flashId: id});
    onClose();
  };

  return (
    <Modal title="Novo usuário" sub="Cadastro com papel padrão e escopo de laboratórios"
      onClose={onClose} width={720}
      footer={<>
        <button type="button" className="btn btn-sm" onClick={onClose}>Cancelar</button>
        <button type="button" className="btn btn-primary btn-sm" onClick={submit}>
          <Icon name="check" size={12}/> Criar usuário
        </button>
      </>}>
      <div className="form-row">
        <div className="field">
          <label htmlFor="novo-usuario-nome">Nome completo *</label>
          <input id="novo-usuario-nome" aria-label="Nome completo" value={f.nome} onChange={e => upd('nome', e.target.value)} placeholder="ex: João da Silva"/>
        </div>
        <div className="field">
          <label htmlFor="novo-usuario-email">E-mail institucional *</label>
          <input id="novo-usuario-email" aria-label="E-mail institucional" type="email" value={f.email} onChange={e => upd('email', e.target.value)} placeholder="joao.silva@instituto.example"/>
        </div>
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="novo-usuario-matricula">Matrícula / SIAPE</label>
          <input id="novo-usuario-matricula" aria-label="Matrícula ou SIAPE" value={f.matricula} onChange={e => upd('matricula', e.target.value)} placeholder="2025006789"/>
        </div>
        <div className="field">
          <label htmlFor="novo-usuario-papel">Papel</label>
          <select id="novo-usuario-papel" value={f.papel} onChange={e => upd('papel', e.target.value)}>
            {Object.entries(ROLES).map(([k, r]) => <option key={k} value={k}>{r.label} · {r.perms.length} permissões</option>)}
          </select>
        </div>
      </div>

      <div className="field" style={{marginBottom: 12}}>
        <label htmlFor="novo-usuario-todos-labs">Escopo de laboratórios *</label>
        <label className="checkbox-line" style={{marginBottom: 6}}>
          <input id="novo-usuario-todos-labs" type="checkbox" aria-label="Acesso a todos os laboratórios" checked={f.todosLabs} onChange={e => upd('todosLabs', e.target.checked)}/>
          <span>Acesso a todos os laboratórios</span>
        </label>
        <div className="lab-chip-grid" style={{opacity: f.todosLabs ? 0.5 : 1, pointerEvents: f.todosLabs ? 'none' : 'auto'}}>
          {LABORATORIOS.map(l => (
            <label key={l.id} className={`lab-chip ${f.labs.includes(l.id) ? 'sel' : ''}`}>
              <input type="checkbox" aria-label={`Laboratório ${l.id} — ${l.nome}`} checked={f.labs.includes(l.id)} onChange={() => toggleLab(l.id)}/>
              <span className="lab-color" style={{background: l.cor}}/>
              <span style={{minWidth: 0}}>
                <span style={{display: 'block', fontWeight: 500, fontSize: 12}}>{l.id}</span>
                <span className="small muted" style={{display: 'block'}}>{l.nome}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="grid-2" style={{gap: 12}}>
        <label className="checkbox-line">
          <input type="checkbox" aria-label="Exigir autenticação em 2 fatores (MFA)" checked={f.mfa} onChange={e => upd('mfa', e.target.checked)}/>
          <span>Exigir autenticação em 2 fatores (MFA)</span>
        </label>
        <label className="checkbox-line">
          <input type="checkbox" aria-label="Usuário externo (auditoria, consultor)" checked={f.externo} onChange={e => upd('externo', e.target.checked)}/>
          <span>Usuário externo (auditoria, consultor)</span>
        </label>
        <label className="checkbox-line" style={{gridColumn: '1 / -1'}}>
          <input type="checkbox" aria-label="Enviar e-mail de convite" checked={f.enviarConvite} onChange={e => upd('enviarConvite', e.target.checked)}/>
          <span>Enviar e-mail de convite: usuário ficará <b>Pendente</b> até o 1º login</span>
        </label>
      </div>

      <div className="hint-card" style={{marginTop: 14}}>
        <Icon name="shield" size={14}/>
        <div className="small">
          O papel <b>{ROLES[f.papel].label}</b> concede {ROLES[f.papel].perms.length} permissões padrão.
          Você pode customizar individualmente após criar o usuário.
        </div>
      </div>
    </Modal>
  );
}

export { ConfirmArquivarUsuario };

// ============== Modal: Excluir ==============

export function ConfirmExcluirUsuario({ usuario, onClose, dispatch }) {
  const [conf, setConf] = useState('');
  const podeExcluir = conf.trim().toUpperCase() === 'EXCLUIR';
  const submit = () => {
    if (!podeExcluir) return;
    const i = USUARIOS.findIndex(u => u.id === usuario.id);
    if (i >= 0) USUARIOS.splice(i, 1);
    logAuditUser('Lucas Souza', 'user.delete', 'Sistema/Usuários',
      `Excluiu definitivamente usuário ${usuario.nome} (${usuario.id})`, 'high');
    dispatch({type: 'refresh'});
    onClose();
  };
  return (
    <Modal title="Excluir definitivamente" onClose={onClose} width={480}
      footer={<>
        <button type="button" className="btn btn-sm" onClick={onClose}>Cancelar</button>
        <button type="button" className="btn btn-sm" disabled={!podeExcluir}
          style={{background: podeExcluir ? 'var(--red)' : 'var(--surface-2)', color: podeExcluir ? '#fff' : 'var(--text-3)', borderColor: podeExcluir ? 'var(--red)' : 'var(--border)'}}
          onClick={submit}>
          <Icon name="trash" size={12}/> Excluir usuário
        </button>
      </>}>
      <div className="row" style={{gap: 12, marginBottom: 14, alignItems: 'flex-start'}}>
        <span className="avatar avatar-lg" style={{background: usuario.cor}}>{usuario.iniciais}</span>
        <div>
          <div style={{fontWeight: 600}}>{usuario.nome}</div>
          <div className="small muted mono">{usuario.email}</div>
          <div style={{marginTop: 6}}>{papelBadge(usuario.papel)}</div>
        </div>
      </div>
      <div className="hint-card danger">
        <Icon name="warning" size={14}/>
        <div className="small">
          <b>Ação irreversível.</b> Os registros de auditoria gerados por este usuário
          permanecem no sistema (compliance LGPD/CGU), mas o vínculo será removido.
          Para a maioria dos casos prefira <b>arquivar</b>.
        </div>
      </div>
      <div className="field" style={{marginTop: 12}}>
        <label htmlFor="excluir-usuario-conf">Digite <span className="mono">EXCLUIR</span> para confirmar</label>
        <input id="excluir-usuario-conf" aria-label="Digite EXCLUIR para confirmar exclusão" value={conf} onChange={e => setConf(e.target.value)} placeholder="EXCLUIR"/>
      </div>
    </Modal>
  );
}
