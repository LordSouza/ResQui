import { useState } from 'react';
import { Icon, Badge } from '../components';
import { ROLES } from '../data';
import Modal from './Modal';
import { useArquivarUsuario } from '../usuarios/useArquivarUsuario';

const papelBadge = (p) => {
  const r = ROLES[p];
  if (!r) return <Badge kind="gray">{p}</Badge>;
  return <span className="role-pill" style={{ '--role-c': r.cor }}>{r.label}</span>;
};

export default function ConfirmArquivarUsuario({ usuario, onClose, dispatch }) {
  const [motivo, setMotivo] = useState('');
  const mutation = useArquivarUsuario();

  const submit = () => {
    mutation.mutate(usuario.id, {
      onSuccess: () => {
        dispatch({ type: 'refresh' });
        onClose();
      },
    });
  };

  return (
    <Modal title="Arquivar usuário" onClose={onClose} width={480}
      footer={<>
        <button type="button" className="btn btn-sm" onClick={onClose}>Cancelar</button>
        <button type="button" className="btn btn-sm" disabled={mutation.isPending}
          style={{ background: 'var(--amber)', color: '#fff', borderColor: 'var(--amber)' }}
          onClick={submit}>
          <Icon name="book" size={12} /> {mutation.isPending ? 'Arquivando…' : 'Arquivar'}
        </button>
      </>}>
      {mutation.isError && <div className="login-err" style={{ marginBottom: 12 }}>{mutation.error.message}</div>}
      <div className="row" style={{ gap: 12, marginBottom: 14, alignItems: 'flex-start' }}>
        <span className="avatar avatar-lg" style={{ background: usuario.cor }}>{usuario.iniciais}</span>
        <div>
          <div style={{ fontWeight: 600 }}>{usuario.nome}</div>
          <div className="small muted mono">{usuario.email}</div>
          <div style={{ marginTop: 6 }}>{papelBadge(usuario.papel)}</div>
        </div>
      </div>
      <div className="hint-card amber">
        <Icon name="warning" size={14} />
        <div className="small">
          O usuário perderá acesso imediato ao ResQui. O histórico de auditoria é <b>preservado</b>.
          A conta pode ser restaurada a qualquer momento.
        </div>
      </div>
      <div className="field" style={{ marginTop: 12 }}>
        <label htmlFor="arquivar-motivo">Motivo (opcional)</label>
        <textarea id="arquivar-motivo" rows="2" value={motivo}
          onChange={e => setMotivo(e.target.value)}
          placeholder="ex: desligamento, fim de bolsa…" />
      </div>
    </Modal>
  );
}
