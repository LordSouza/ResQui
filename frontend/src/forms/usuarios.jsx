import { useState } from 'react';
import { Icon, Badge } from '../components';
import { ROLES } from '../data';
import { usePode } from '../auth/permissoes';
import Modal from './Modal';
import ConfirmArquivarUsuario from './ConfirmArquivarUsuario';
import { useCriarUsuario } from '../usuarios/useCriarUsuario';
import { useExcluirUsuario } from '../usuarios/useExcluirUsuario';
import { useResetar2fa } from '../usuarios/useResetar2fa';

const papelBadge = (p) => {
  const r = ROLES[p];
  if (!r) return <Badge kind="gray">{p}</Badge>;
  return <span className="role-pill" style={{'--role-c': r.cor}}>{r.label}</span>;
};

// ============== Modal: Novo usuário ==============

export function FormNovoUsuario({ onClose, dispatch }) {
  const podeQualquerPapel = usePode('Administracao');
  const [f, setF] = useState({
    nome: '', email: '', senha: '', matricula: '', papel: 'Aluno',
  });
  const mutation = useCriarUsuario();
  const upd = (k, v) => setF(s => ({ ...s, [k]: v }));

  const submit = () => {
    if (!f.nome.trim() || !f.email.trim() || !f.senha.trim()) {
      alert('Nome, e-mail e senha são obrigatórios.');
      return;
    }
    mutation.mutate(
      {
        Nome: f.nome.trim(),
        Email: f.email.trim(),
        Senha: f.senha,
        Matricula: f.matricula.trim() || null,
        Papel: f.papel,
      },
      {
        onSuccess: () => {
          dispatch({ type: 'refresh' });
          onClose();
        },
      }
    );
  };

  return (
    <Modal title="Novo usuário" sub="Cadastro com papel padrão"
      onClose={onClose} width={520}
      footer={<>
        <button type="button" className="btn btn-sm" onClick={onClose}>Cancelar</button>
        <button type="button" className="btn btn-primary btn-sm" onClick={submit} disabled={mutation.isPending}>
          <Icon name="check" size={12} /> {mutation.isPending ? 'Criando…' : 'Criar usuário'}
        </button>
      </>}>
      {mutation.isError && <div className="login-err" style={{ marginBottom: 12 }}>{mutation.error.message}</div>}
      <div className="form-row">
        <div className="field"><label htmlFor="nu-nome">Nome completo *</label>
          <input id="nu-nome" value={f.nome} onChange={e => upd('nome', e.target.value)} placeholder="Ana Lima" />
        </div>
      </div>
      <div className="form-row">
        <div className="field"><label htmlFor="nu-email">E-mail *</label>
          <input id="nu-email" type="email" value={f.email} onChange={e => upd('email', e.target.value)} placeholder="ana@instituto.example" />
        </div>
        <div className="field"><label htmlFor="nu-matricula">Matrícula</label>
          <input id="nu-matricula" value={f.matricula} onChange={e => upd('matricula', e.target.value)} placeholder="2024000123" />
        </div>
      </div>
      <div className="form-row">
        <div className="field"><label htmlFor="nu-senha">Senha *</label>
          <input id="nu-senha" type="password" value={f.senha} onChange={e => upd('senha', e.target.value)} placeholder="Mínimo 8 caracteres" />
        </div>
        <div className="field"><label htmlFor="nu-papel">Papel</label>
          <select id="nu-papel" value={f.papel} onChange={e => upd('papel', e.target.value)} disabled={!podeQualquerPapel}>
            {Object.entries(ROLES)
              .filter(([k]) => podeQualquerPapel || k === 'Aluno')
              .map(([k, r]) => <option key={k} value={k}>{r.label}</option>)}
          </select>
        </div>
      </div>
    </Modal>
  );
}

export { ConfirmArquivarUsuario };

// ============== Modal: Excluir ==============

export function ConfirmExcluirUsuario({ usuario, onClose, dispatch }) {
  const [conf, setConf] = useState('');
  const mutation = useExcluirUsuario();
  const podeExcluir = conf.trim().toUpperCase() === 'EXCLUIR';
  const submit = () => {
    if (!podeExcluir) return;
    mutation.mutate(usuario.id, {
      onSuccess: () => { dispatch({ type: 'refresh' }); onClose(); },
    });
  };
  return (
    <Modal title="Excluir definitivamente" onClose={onClose} width={480}
      footer={<>
        <button type="button" className="btn btn-sm" onClick={onClose}>Cancelar</button>
        <button type="button" className="btn btn-sm" disabled={!podeExcluir || mutation.isPending}
          style={{background: podeExcluir ? 'var(--red)' : 'var(--surface-2)', color: podeExcluir ? '#fff' : 'var(--text-3)', borderColor: podeExcluir ? 'var(--red)' : 'var(--border)'}}
          onClick={submit}>
          <Icon name="trash" size={12}/> {mutation.isPending ? 'Excluindo…' : 'Excluir usuário'}
        </button>
      </>}>
      {mutation.isError && <div className="login-err" style={{ marginBottom: 12 }}>{mutation.error.message}</div>}
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

// ============== Modal: Resetar 2FA ==============

export function ConfirmResetar2fa({ usuario, onClose, dispatch }) {
  const mutation = useResetar2fa();
  const submit = () => mutation.mutate(usuario.id, {
    onSuccess: () => { dispatch({ type: 'refresh' }); onClose(); },
  });
  return (
    <Modal title="Resetar autenticação em dois fatores" onClose={onClose} width={480}
      footer={<>
        <button type="button" className="btn btn-sm" onClick={onClose}>Cancelar</button>
        <button type="button" className="btn btn-sm" disabled={mutation.isPending}
          style={{background: 'var(--red)', color: '#fff', borderColor: 'var(--red)'}}
          onClick={submit}>
          <Icon name="shield" size={12}/> {mutation.isPending ? 'Resetando…' : 'Resetar 2FA'}
        </button>
      </>}>
      {mutation.isError && <div className="login-err" style={{ marginBottom: 12 }}>{mutation.error.message}</div>}
      <div className="row" style={{gap: 12, marginBottom: 14, alignItems: 'flex-start'}}>
        <span className="avatar avatar-lg" style={{background: usuario.cor}}>{usuario.iniciais}</span>
        <div>
          <div style={{fontWeight: 600}}>{usuario.nome}</div>
          <div className="small muted mono">{usuario.email}</div>
        </div>
      </div>
      <div className="hint-card danger">
        <Icon name="warning" size={14}/>
        <div className="small">
          O aplicativo autenticador e os <b>códigos de recuperação</b> deste usuário deixam de
          valer, e <b>todas as sessões abertas são encerradas</b>. Ele volta a entrar só com a
          senha e precisa configurar o 2FA de novo. O reset é registrado na auditoria e
          comunicado por e-mail.
        </div>
      </div>
    </Modal>
  );
}
