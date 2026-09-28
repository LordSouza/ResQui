import { useState } from 'react';
import { Icon, Badge } from '../components';
import { ROLES } from '../data';
import { usePode } from '../auth/permissoes';
import Modal from './Modal';
import { SeletorLaboratorios } from './FormLaboratoriosUsuario';
import { useLaboratoriosDoUsuario } from '../laboratorios/useLaboratoriosDoUsuario';
import ConfirmArquivarUsuario from './ConfirmArquivarUsuario';
import { useCriarUsuario } from '../usuarios/useCriarUsuario';
import { useExcluirUsuario } from '../usuarios/useExcluirUsuario';
import { useResetar2fa } from '../usuarios/useResetar2fa';
import { useConvites } from '../convites/useConvites';
import { useCriarConvite } from '../convites/useCriarConvite';
import { useRevogarConvite } from '../convites/useRevogarConvite';
import { linkConvite } from '../convites/linkConvite';

const ERRO_SEM_LABORATORIO = 'Escolha pelo menos um laboratório: conta sem laboratório só o Admin enxerga.';

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
  const [laboratorios, setLaboratorios] = useState([]);
  const [erro, setErro] = useState('');
  const { isPending: escopoPendente } = useLaboratoriosDoUsuario();
  const mutation = useCriarUsuario();
  const upd = (k, v) => setF(s => ({ ...s, [k]: v }));

  const submit = () => {
    if (!f.nome.trim() || !f.email.trim() || !f.senha.trim()) {
      setErro('Nome, e-mail e senha são obrigatórios.');
      return;
    }
    if (!podeQualquerPapel && laboratorios.length === 0) {
      setErro(ERRO_SEM_LABORATORIO);
      return;
    }
    setErro('');
    mutation.mutate(
      {
        Nome: f.nome.trim(),
        Email: f.email.trim(),
        Senha: f.senha,
        Matricula: f.matricula.trim() || null,
        Papel: f.papel,
        LaboratorioIds: laboratorios,
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
        <button type="button" className="btn btn-primary btn-sm" onClick={submit} disabled={mutation.isPending || escopoPendente}>
          <Icon name="check" size={12} /> {mutation.isPending ? 'Criando…' : 'Criar usuário'}
        </button>
      </>}>
      {erro && <div className="login-err" style={{ marginBottom: 12 }}>{erro}</div>}
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
      <div className="form-row full">
        <div className="field">
          <span className="field-label" id="nu-labs">Laboratórios</span>
          <SeletorLaboratorios id="nu-labs" value={laboratorios} onChange={setLaboratorios} />
        </div>
      </div>
    </Modal>
  );
}

export { ConfirmArquivarUsuario };

// ============== Modal: Convidar por link ==============

const STATUS_CONVITE = {
  pendente: { kind: 'blue', label: 'Pendente' },
  usado: { kind: 'green', label: 'Usado' },
  expirado: { kind: 'gray', label: 'Expirado' },
  revogado: { kind: 'gray', label: 'Revogado' },
};

export function FormConvidarUsuario({ onClose }) {
  const podeQualquerPapel = usePode('Administracao');
  const [papel, setPapel] = useState('Aluno');
  const [laboratorios, setLaboratorios] = useState([]);
  const [erro, setErro] = useState('');
  const [gerado, setGerado] = useState(null);
  const [copiado, setCopiado] = useState(false);
  const [falhaAoCopiar, setFalhaAoCopiar] = useState(false);
  const { isPending: escopoPendente } = useLaboratoriosDoUsuario();
  const criar = useCriarConvite();
  const revogar = useRevogarConvite();
  const revogarConvite = (id) => revogar.mutate(id, {
    onSuccess: () => { if (gerado?.id === id) setGerado(null); },
  });
  const convites = useConvites();

  const descartarLink = () => { setGerado(null); setCopiado(false); setFalhaAoCopiar(false); };
  const trocarPapel = (novo) => { setPapel(novo); descartarLink(); };
  const trocarLaboratorios = (novos) => { setLaboratorios(novos); setErro(''); descartarLink(); };

  const gerar = () => {
    if (!podeQualquerPapel && laboratorios.length === 0) {
      setErro(ERRO_SEM_LABORATORIO);
      return;
    }
    criar.mutate({ Papel: papel, LaboratorioIds: laboratorios }, {
      onSuccess: (convite) => {
        setGerado({ id: convite.id, link: linkConvite(convite.token), papel: convite.papel });
        setCopiado(false);
        setFalhaAoCopiar(false);
      },
    });
  };

  const copiar = async () => {
    try {
      if (!navigator.clipboard) throw new Error('sem clipboard');
      await navigator.clipboard.writeText(gerado.link);
      setCopiado(true);
      setFalhaAoCopiar(false);
    } catch {
      setFalhaAoCopiar(true);
      setCopiado(false);
    }
  };

  return (
    <Modal tutorial="convidarUsuario" title="Convidar por link" sub="O convidado define a própria senha"
      onClose={onClose} width={560}
      footer={<>
        <button type="button" className="btn btn-sm" onClick={onClose}>Fechar</button>
        <button type="button" className="btn btn-primary btn-sm" onClick={gerar} disabled={criar.isPending || escopoPendente}>
          <Icon name="plus" size={12} /> {criar.isPending ? 'Gerando…' : 'Gerar link'}
        </button>
      </>}>
      {erro && <div className="login-err" style={{ marginBottom: 12 }}>{erro}</div>}
      {criar.isError && <div className="login-err" style={{ marginBottom: 12 }}>{criar.error.message}</div>}
      {revogar.isError && <div className="login-err" style={{ marginBottom: 12 }}>{revogar.error.message}</div>}

      <div className="form-row">
        <div className="field"><label htmlFor="convite-papel">Papel do convidado</label>
          <select id="convite-papel" value={papel} onChange={e => trocarPapel(e.target.value)} disabled={!podeQualquerPapel}>
            {Object.entries(ROLES)
              .filter(([k]) => k !== 'Admin' && (podeQualquerPapel || k === 'Aluno'))
              .map(([k, r]) => <option key={k} value={k}>{r.label}</option>)}
          </select>
        </div>
      </div>

      <div className="form-row full">
        <div className="field">
          <span className="field-label" id="convite-labs">Laboratórios do convidado</span>
          <SeletorLaboratorios id="convite-labs" value={laboratorios} onChange={trocarLaboratorios} />
        </div>
      </div>

      {gerado && (
        <div className="hint-card amber" style={{marginTop: 4, display: 'block'}}>
          <div className="small" style={{marginBottom: 8}}>
            <b>Copie agora.</b> Este link cria uma conta de <b>{ROLES[gerado.papel]?.label ?? gerado.papel}</b>,
            aparece uma única vez, vale para um cadastro e expira em 7 dias.
          </div>
          <div className="mono" style={{fontSize: 12, wordBreak: 'break-all', padding: 10, background: 'var(--surface-2)', borderRadius: 'var(--radius)', color: 'var(--text)'}}>
            {gerado.link}
          </div>
          <button type="button" className="btn btn-sm" style={{marginTop: 10}} onClick={copiar}>
            <Icon name="clipboard" size={12}/> {copiado ? 'Copiado' : 'Copiar link'}
          </button>
          {falhaAoCopiar && (
            <div className="small" style={{marginTop: 8}}>
              Não foi possível copiar automaticamente — selecione o link acima e copie à mão.
            </div>
          )}
        </div>
      )}

      <div style={{marginTop: 16}}>
        <div className="small muted" style={{marginBottom: 8}}>Convites gerados</div>
        {convites.isPending && <div className="page-loading"><Icon name="refresh" size={14}/> Carregando…</div>}
        {convites.isError && <div className="small muted">Não foi possível carregar os convites.</div>}
        {convites.isSuccess && convites.data.length === 0 && <div className="small muted">Nenhum convite gerado ainda.</div>}
        {convites.isSuccess && convites.data.length > 0 && (
          <table className="tbl">
            <thead>
              <tr><th>Papel</th><th>Situação</th><th>Expira</th><th></th></tr>
            </thead>
            <tbody>
              {convites.data.map(c => {
                const st = STATUS_CONVITE[c.status] ?? { kind: 'gray', label: c.status };
                return (
                  <tr key={c.id}>
                    <td>{ROLES[c.papel]?.label ?? c.papel}</td>
                    <td><Badge kind={st.kind}>{st.label}</Badge>{c.usadoPor ? <span className="small muted"> · {c.usadoPor}</span> : null}</td>
                    <td className="small muted">{new Date(c.expiraEm).toLocaleDateString('pt-BR')}</td>
                    <td style={{textAlign: 'right'}}>
                      {c.status === 'pendente' && (podeQualquerPapel || c.papel === 'Aluno') && (
                        <button type="button" className="btn btn-sm btn-ghost" disabled={revogar.isPending}
                          onClick={() => revogarConvite(c.id)}>Revogar</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </Modal>
  );
}

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
