import { useState } from 'react';
import { Icon, Badge } from '../components';
import { USUARIOS, AUDITORIA, ROLES } from '../data';
import { pgrsTs } from '../utils';
import Modal from './Modal';

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

export default function ConfirmArquivarUsuario({ usuario, onClose, dispatch }) {
  const [motivo, setMotivo] = useState('');
  const submit = () => {
    usuario.status = 'arquivado';
    usuario.arquivado = new Date().toISOString().slice(0, 10);
    logAuditUser('Lucas Souza', 'user.archive', 'Sistema/Usuários',
      `Arquivou usuário ${usuario.nome} (${usuario.id})${motivo ? ' · motivo: ' + motivo : ''}`, 'med');
    dispatch({type: 'refresh', flashId: usuario.id});
    onClose();
  };
  return (
    <Modal title="Arquivar usuário" onClose={onClose} width={480}
      footer={<>
        <button type="button" className="btn btn-sm" onClick={onClose}>Cancelar</button>
        <button type="button" className="btn btn-sm" style={{background: 'var(--amber)', color: '#fff', borderColor: 'var(--amber)'}} onClick={submit}>
          <Icon name="book" size={12}/> Arquivar
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
      <div className="hint-card amber">
        <Icon name="warning" size={14}/>
        <div className="small">
          O usuário perderá acesso imediato ao ResQui. O histórico de auditoria
          (movimentações, baixas, MTRs) é <b>preservado</b> e segue visível nos relatórios.
          A conta pode ser restaurada a qualquer momento.
        </div>
      </div>
      <div className="field" style={{marginTop: 12}}>
        <label htmlFor="arquivar-motivo">Motivo (opcional)</label>
        <textarea id="arquivar-motivo" aria-label="Motivo do arquivamento (opcional)" rows="2" value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="ex: desligamento, fim de bolsa de pesquisa…"/>
      </div>
    </Modal>
  );
}
