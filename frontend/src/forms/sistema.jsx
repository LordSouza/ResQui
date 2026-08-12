import { useState, useEffect } from 'react';
import { Icon, Badge } from '../components';
import Modal from './Modal';
import { useGetNotificacaoPrefs } from '../notificacoes/useGetNotificacaoPrefs';
import { useNotificacaoPrefs } from '../notificacoes/useNotificacaoPrefs';
import { useCriarChamado } from '../chamados/useCriarChamado';
import { useAuth } from '../auth/AuthContext';
import { useAtualizarPerfil } from '../auth/useAtualizarPerfil';
import { iniciaisUsuario } from '../utils';
import {
  useAlterarSenha, useSetup2fa, useAtivar2fa, useDesativar2fa,
  useSessoes, useRevogarSessao, useRevogarOutrasSessoes, useGerarCodigosRecuperacao,
} from '../auth/useSeguranca';

const pgrsHint = { fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5, marginBottom: 14, padding: '8px 10px', background: 'var(--surface-2)', borderRadius: 'var(--radius)', borderLeft: '3px solid var(--accent)' };
const pgrsSub = { fontSize: 12, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', marginBottom: 8, marginTop: 4 };
const pgrsCheck = { display: 'flex', gap: 8, alignItems: 'center', fontSize: 12.5, padding: '4px 0', cursor: 'pointer' };

// ---------- Conta: Perfil ----------
export function FormPerfil({ onClose }) {
  const { user, updateUser } = useAuth();
  const mutation = useAtualizarPerfil();
  const [nome, setNome] = useState(user?.nome ?? '');
  const [email, setEmail] = useState(user?.email ?? '');

  const podeSalvar = nome.trim() !== '' && email.includes('@');
  const salvar = () => {
    if (!podeSalvar) return;
    mutation.mutate(
      { Nome: nome.trim(), Email: email.trim() },
      { onSuccess: (profile) => { updateUser(profile); onClose(); } }
    );
  };

  const avatarStyle = {
    width: 80, height: 80, borderRadius: '50%', background: 'var(--accent)',
    color: '#fff', display: 'grid', placeItems: 'center', fontSize: 28, fontWeight: 600,
    flexShrink: 0,
  };
  return (
    <Modal title="Perfil" sub="Dados da conta" onClose={onClose} width={600}
      footer={<>
        <button type="button" className="btn btn-sm" onClick={onClose}>Cancelar</button>
        <button type="button" className="btn btn-primary btn-sm" onClick={salvar} disabled={mutation.isPending || !podeSalvar}>
          <Icon name="check" size={12}/> {mutation.isPending ? 'Salvando…' : 'Salvar'}
        </button>
      </>}>
      {mutation.isError && <div className="login-err" style={{ marginBottom: 12 }}>{mutation.error.message}</div>}
      <div style={{display: 'flex', gap: 18, alignItems: 'center', marginBottom: 18}}>
        <div style={avatarStyle}>{iniciaisUsuario({ ...user, nome })}</div>
        <div style={{fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5}}>
          Edite seu nome e e-mail. Matrícula e papel são geridos pela instituição.
        </div>
      </div>

      <div className="form-row">
        <div className="field"><label htmlFor="perfil-nome">Nome</label>
          <input id="perfil-nome" aria-label="Nome" value={nome} onChange={e => setNome(e.target.value)}/></div>
        <div className="field"><label htmlFor="perfil-matricula">Matrícula / SIAPE</label>
          <input id="perfil-matricula" aria-label="Matrícula / SIAPE" value={user?.matricula ?? '—'} readOnly style={{fontFamily: 'var(--mono)'}}/></div>
      </div>
      <div className="form-row">
        <div className="field"><label htmlFor="perfil-email">E-mail</label>
          <input id="perfil-email" aria-label="E-mail" type="email" value={email} onChange={e => setEmail(e.target.value)} style={{fontFamily: 'var(--mono)'}}/></div>
        <div className="field"><label htmlFor="perfil-papel">Papel</label>
          <input id="perfil-papel" aria-label="Papel" value={user?.papel ?? '—'} readOnly/></div>
      </div>
    </Modal>
  );
}

function PainelCodigosRecuperacao({ codigos }) {
  const texto = codigos.join('\n');
  const copiar = () => navigator.clipboard?.writeText(texto);
  const baixar = () => {
    const url = URL.createObjectURL(new Blob([texto], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'resqui-codigos-recuperacao.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{padding: 12, border: '1px solid var(--amber)', background: 'var(--amber-soft)', borderRadius: 'var(--radius)', marginTop: 12}}>
      <div style={{fontSize: 13, fontWeight: 600, marginBottom: 6}}>
        <Icon name="shield" size={13}/> Guarde seus códigos de recuperação
      </div>
      <div style={{fontSize: 12, color: 'var(--text-2)', marginBottom: 10}}>
        Cada código serve uma única vez e substitui o app autenticador. Eles <strong>só serão exibidos uma vez</strong> — guarde-os fora deste computador.
      </div>
      <div className="mono" style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 13, padding: 10, background: 'var(--surface-2)', borderRadius: 'var(--radius)'}}>
        {codigos.map(c => <div key={c}>{c}</div>)}
      </div>
      <div style={{display: 'flex', gap: 8, marginTop: 10}}>
        <button type="button" className="btn btn-sm" onClick={copiar}>Copiar</button>
        <button type="button" className="btn btn-sm" onClick={baixar}>Baixar .txt</button>
      </div>
    </div>
  );
}

// ---------- Senha e 2FA ----------
export function FormSenha2FA({ onClose, dispatch }) {
  const { user, updateUser } = useAuth();
  const [aba, setAba] = useState('senha');
  const [pwd, setPwd] = useState({ atual: '', nova: '', conf: '' });
  // Derivado do AuthContext, não copiado para estado local: com uma cópia, reabrir o modal na
  // mesma sessão mostrava "2FA desativado" depois de ativar (o AuthContext só busca /api/auth/me
  // no mount da página) e um clique em "Ativar 2FA" destruía os códigos recém-salvos.
  const mfaEnabled = !!user?.twoFactorEnabled;
  const restantes = user?.codigosRecuperacaoRestantes ?? 0;
  const sincronizar2fa = (ativo, qtdCodigos) =>
    updateUser?.({ ...user, twoFactorEnabled: ativo, codigosRecuperacaoRestantes: qtdCodigos });

  const alterarSenha = useAlterarSenha();
  const setup2fa = useSetup2fa();
  const ativar2fa = useAtivar2fa();
  const desativar2fa = useDesativar2fa();
  const gerarCodigos = useGerarCodigosRecuperacao();

  const [setup, setSetup] = useState(null); // { secret, otpauthUri }
  const [codigo, setCodigo] = useState('');
  const [codigosRecuperacao, setCodigosRecuperacao] = useState(null);
  const [senhaSetup, setSenhaSetup] = useState('');

  const forcaSenha = (s) => {
    let score = 0;
    if (s.length >= 8) score++;
    if (s.length >= 12) score++;
    if (/[A-Z]/.test(s) && /[a-z]/.test(s)) score++;
    if (/\d/.test(s)) score++;
    if (/[^A-Za-z0-9]/.test(s)) score++;
    return score;
  };
  const forca = forcaSenha(pwd.nova);
  const forcaLabel = ['Muito fraca', 'Fraca', 'Razoável', 'Boa', 'Forte', 'Excelente'][forca];
  const forcaColor = ['var(--red)', 'var(--red)', 'var(--amber)', 'var(--amber)', 'var(--green)', 'var(--green)'][forca];

  const validPwd = pwd.atual && pwd.nova && pwd.nova === pwd.conf && forca >= 3;

  const salvarSenha = () => {
    alterarSenha.mutate(
      { senhaAtual: pwd.atual, novaSenha: pwd.nova },
      { onSuccess: () => { dispatch({ type: 'refresh' }); onClose(); } }
    );
  };

  const iniciarSetup = () => setup2fa.mutate(senhaSetup, {
    onSuccess: (data) => { setSetup(data); setSenhaSetup(''); },
  });
  const confirmarAtivacao = () => ativar2fa.mutate(codigo, {
    onSuccess: (data) => {
      setSetup(null); setCodigo('');
      setCodigosRecuperacao(data?.codigos ?? []);
      sincronizar2fa(true, data?.codigos?.length ?? 0);
      dispatch({ type: 'refresh' });
    },
  });
  const desativar = () => {
    const c = window.prompt('Digite o código do autenticador (ou um código de recuperação) para desativar o 2FA:');
    if (c) desativar2fa.mutate(c, {
      onSuccess: () => { setCodigosRecuperacao(null); sincronizar2fa(false, 0); dispatch({ type: 'refresh' }); },
    });
  };
  const regenerar = () => {
    const c = window.prompt('Digite o código do autenticador (ou um código de recuperação) para gerar novos códigos:');
    if (!c) return;
    gerarCodigos.mutate(c, {
      onSuccess: (data) => {
        setCodigosRecuperacao(data?.codigos ?? []);
        sincronizar2fa(true, data?.codigos?.length ?? 0);
      },
    });
  };

  return (
    <Modal title="Senha e autenticação" sub="Credenciais de acesso e MFA"
      onClose={onClose} width={620}
      footer={aba === 'senha' ? <>
        <button type="button" className="btn btn-sm" onClick={onClose}>Cancelar</button>
        <button type="button" className="btn btn-primary btn-sm" disabled={!validPwd || alterarSenha.isPending} onClick={salvarSenha}>
          <Icon name="check" size={12}/> {alterarSenha.isPending ? 'Salvando…' : 'Alterar senha'}
        </button>
      </> : <button type="button" className="btn btn-sm" onClick={onClose}>Fechar</button>}>
      <div className="tabs">
        <button type="button" className={`tab ${aba === 'senha' ? 'active' : ''}`} onClick={() => setAba('senha')}>Senha</button>
        <button type="button" className={`tab ${aba === 'mfa' ? 'active' : ''}`} onClick={() => setAba('mfa')}>Autenticação em dois fatores</button>
      </div>

      {aba === 'senha' && (
        <div>
          <div className="form-row full">
            <div className="field"><label htmlFor="senha-atual">Senha atual</label>
              <input id="senha-atual" type="password" aria-label="Senha atual" value={pwd.atual} onChange={e => setPwd(p => ({...p, atual: e.target.value}))}/></div>
          </div>
          <div className="form-row full">
            <div className="field"><label htmlFor="senha-nova">Nova senha</label>
              <input id="senha-nova" type="password" aria-label="Nova senha" value={pwd.nova} onChange={e => setPwd(p => ({...p, nova: e.target.value}))}/></div>
          </div>
          {pwd.nova && (
            <div style={{margin: '-4px 0 12px'}}>
              <div style={{display: 'flex', gap: 3, marginBottom: 4}}>
                {[0, 1, 2, 3, 4].map(i => (
                  <div key={i} style={{flex: 1, height: 4, borderRadius: 2,
                    background: i < forca ? forcaColor : 'var(--surface-3)'}}/>
                ))}
              </div>
              <div style={{fontSize: 12, color: forcaColor, fontWeight: 500}}>{forcaLabel}</div>
            </div>
          )}
          <div className="form-row full">
            <div className="field"><label htmlFor="senha-conf">Confirme a nova senha</label>
              <input id="senha-conf" type="password" aria-label="Confirme a nova senha" value={pwd.conf} onChange={e => setPwd(p => ({...p, conf: e.target.value}))}/>
              {pwd.conf && pwd.nova !== pwd.conf && <div style={{fontSize: 12, color: 'var(--red)', marginTop: 4}}>As senhas não coincidem.</div>}
            </div>
          </div>
          <div style={{padding: 10, background: 'var(--surface-2)', borderRadius: 'var(--radius)', fontSize: 12, lineHeight: 1.6, marginTop: 8}}>
            <strong>Requisitos:</strong>
            <ul style={{margin: '4px 0 0 18px', padding: 0}}>
              <li>Mínimo 6 caracteres (recomendado 12+)</li>
              <li>Combinar letras maiúsculas, minúsculas e números</li>
              <li>Pelo menos 1 caractere especial</li>
            </ul>
          </div>
        </div>
      )}

      {aba === 'mfa' && (
        <div>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: 12, background: mfaEnabled ? 'var(--green-soft)' : 'var(--amber-soft)', border: `1px solid ${mfaEnabled ? '#b8dec7' : '#efd9a4'}`, borderRadius: 'var(--radius)', marginBottom: 14}}>
            <div>
              <div style={{fontSize: 13, fontWeight: 600, color: mfaEnabled ? 'var(--green)' : 'var(--amber)'}}>
                <Icon name="shield" size={13}/> 2FA {mfaEnabled ? 'ativo' : 'desativado'}
              </div>
              <div style={{fontSize: 12, color: 'var(--text-2)', marginTop: 4}}>
                {mfaEnabled
                  ? 'Sua conta exige um segundo fator a cada login. Método ativo: aplicativo autenticador (TOTP).'
                  : 'Recomendado para administradores. Sem 2FA, a conta fica vulnerável a vazamento de senha.'}
              </div>
            </div>
            {mfaEnabled
              ? <div style={{display: 'flex', gap: 8}}>
                  <button type="button" className="btn btn-sm" disabled={gerarCodigos.isPending} onClick={regenerar}>
                    {gerarCodigos.isPending ? '…' : 'Gerar novos códigos'}
                  </button>
                  <button type="button" className="btn btn-sm" disabled={desativar2fa.isPending} onClick={desativar}>Desativar</button>
                </div>
              : <div style={{display: 'flex', gap: 8, alignItems: 'flex-end'}}>
                  <div className="field" style={{margin: 0}}>
                    <label htmlFor="senha-setup-2fa">Senha atual</label>
                    <input id="senha-setup-2fa" type="password" autoComplete="current-password"
                      aria-label="Senha atual para ativar o 2FA"
                      value={senhaSetup} onChange={e => setSenhaSetup(e.target.value)}/>
                  </div>
                  <button type="button" className="btn btn-sm" disabled={!senhaSetup || setup2fa.isPending} onClick={iniciarSetup}>
                    {setup2fa.isPending ? '…' : 'Ativar 2FA'}
                  </button>
                </div>}
          </div>

          {setup2fa.isError && <div className="login-err" style={{marginBottom: 12}}>{setup2fa.error.message}</div>}

          {mfaEnabled && !codigosRecuperacao && (
            <div style={{fontSize: 12, color: restantes <= 2 ? 'var(--amber)' : 'var(--text-2)', marginBottom: 12}}>
              {restantes} de 10 códigos de recuperação restantes.
              {restantes <= 2 && ' Gere novos códigos antes que acabem.'}
            </div>
          )}
          {codigosRecuperacao && <PainelCodigosRecuperacao codigos={codigosRecuperacao}/>}

          {!mfaEnabled && setup && (
            <div style={{padding: 12, border: '1px solid var(--border)', borderRadius: 'var(--radius)'}}>
              <div style={pgrsSub}>1. Adicione esta chave ao seu app autenticador</div>
              <div className="mono" style={{fontSize: 13, padding: '8px 10px', background: 'var(--surface-2)', borderRadius: 'var(--radius)', wordBreak: 'break-all', marginBottom: 10}}>
                {setup.secret}
              </div>
              <div style={{fontSize: 12, color: 'var(--text-3)', marginBottom: 10, wordBreak: 'break-all'}}>
                Ou use a URI otpauth: <span className="mono">{setup.otpauthUri}</span>
              </div>
              <div style={pgrsSub}>2. Informe o código gerado para confirmar</div>
              <div style={{display: 'flex', gap: 8}}>
                <input inputMode="numeric" aria-label="Código de verificação" placeholder="000000"
                  value={codigo} onChange={e => setCodigo(e.target.value)} style={{flex: 1}}/>
                <button type="button" className="btn btn-primary btn-sm" disabled={!codigo || ativar2fa.isPending} onClick={confirmarAtivacao}>
                  {ativar2fa.isPending ? 'Verificando…' : 'Confirmar'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

// ---------- Sessões ativas ----------
export function FormSessoes({ onClose }) {
  const { data: sessoes = [], isPending } = useSessoes();
  const revogar = useRevogarSessao();
  const revogarOutras = useRevogarOutrasSessoes();

  const outras = sessoes.filter(s => !s.atual).length;
  const fmt = (iso) => iso ? iso.replace('T', ' ').slice(0, 16) : '—';

  return (
    <Modal title="Sessões ativas" sub="Dispositivos atualmente conectados à sua conta"
      onClose={onClose} width={620}
      footer={<>
        <button type="button" className="btn btn-sm" onClick={onClose}>Fechar</button>
        {outras > 0 && (
          <button type="button" className="btn btn-sm" disabled={revogarOutras.isPending}
            onClick={() => revogarOutras.mutate()} style={{color: 'var(--red)', borderColor: 'var(--red)'}}>
            <Icon name="close" size={12}/> Encerrar {outras} outra{outras > 1 ? 's' : ''}
          </button>
        )}
      </>}>
      <div style={pgrsHint}>
        Se você não reconhece alguma sessão, encerre-a imediatamente e <strong>altere sua senha</strong>.
      </div>
      {isPending && <div style={{padding: 8, fontSize: 12}}>Carregando…</div>}
      {!isPending && sessoes.length === 0 && <div className="muted" style={{padding: 8, fontSize: 12}}>Nenhuma sessão ativa.</div>}
      <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
        {sessoes.map(s => (
          <div key={s.jti} style={{
            padding: 12, border: `1px solid ${s.atual ? 'var(--accent-soft-2)' : 'var(--border)'}`,
            background: s.atual ? 'var(--accent-soft)' : '#fff',
            borderRadius: 'var(--radius)',
          }}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12}}>
              <div style={{flex: 1}}>
                <div style={{display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6}}>
                  <span style={{fontSize: 13, fontWeight: 600}}>{s.userAgent || 'Dispositivo desconhecido'}</span>
                  {s.atual && <Badge kind="blue" dot>Sessão atual</Badge>}
                </div>
                <div style={{display: 'grid', gridTemplateColumns: '90px 1fr', gap: '3px 10px', fontSize: 12}}>
                  <span style={{color: 'var(--text-3)'}}>Sessão</span><span style={{fontFamily: 'var(--mono)'}}>{s.jti.slice(0, 12)}…</span>
                  <span style={{color: 'var(--text-3)'}}>Iniciada</span><span style={{fontFamily: 'var(--mono)'}}>{fmt(s.criadaEm)}</span>
                  <span style={{color: 'var(--text-3)'}}>Expira</span><span style={{fontFamily: 'var(--mono)'}}>{fmt(s.expiraEm)}</span>
                </div>
              </div>
              {!s.atual && (
                <button type="button" className="btn btn-sm" disabled={revogar.isPending}
                  onClick={() => revogar.mutate(s.jti)}
                  style={{color: 'var(--red)', borderColor: 'var(--red)'}}>
                  Encerrar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

// ---------- Notificações ----------
function NotifToggle({ on, onClick }) {
  const toggleBtnStyle = {
    width: 36, height: 20, borderRadius: 10, border: 0, cursor: 'pointer',
    background: on ? 'var(--accent)' : 'var(--surface-3)',
    position: 'relative', transition: 'background 0.15s', padding: 0,
  };
  const toggleKnobStyle = {
    position: 'absolute', top: 2, left: on ? 18 : 2, width: 16, height: 16,
    borderRadius: '50%', background: '#fff', transition: 'left 0.15s',
    boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
  };
  return (
    <div style={{display: 'flex', justifyContent: 'center'}}>
      <button type="button" onClick={onClick} aria-label={on ? 'Desativar notificação' : 'Ativar notificação'} style={toggleBtnStyle}>
        <span style={toggleKnobStyle}/>
      </button>
    </div>
  );
}

const notifStat = { padding: 12, background: 'var(--accent-soft)', border: '1px solid var(--accent-soft-2)', borderRadius: 'var(--radius)', textAlign: 'center' };
const notifStatNum = { fontSize: 22, fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' };
const notifStatLabel = { fontSize: 12, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 2 };

export function FormNotificacoes({ onClose }) {
  const { data: prefs, isPending: isLoading } = useGetNotificacaoPrefs();
  const mutation = useNotificacaoPrefs();
  const [local, setLocal] = useState(null);

  useEffect(() => {
    if (prefs && !local) setLocal(prefs);
  }, [prefs]);

  const toggle = (tipo) => setLocal(prev => ({ ...prev, [tipo]: !prev[tipo] }));

  const handleSave = () => mutation.mutate(local, { onSuccess: onClose });

  const tipos = [
    { key: 'expiry',    icon: 'warning',   label: 'Vencimento de reagentes' },
    { key: 'low-stock', icon: 'flask',     label: 'Estoque abaixo do mínimo' },
    { key: 'compat',    icon: 'shield',    label: 'Tentativa de incompatibilidade' },
    { key: 'coleta',    icon: 'clipboard', label: 'Resíduos aguardando coleta' },
  ];

  return (
    <Modal title="Preferências de Notificação" onClose={onClose}>
      {isLoading && <div style={{padding: 16}}>Carregando...</div>}
      {local && (
        <>
          <div style={{padding: '8px 0'}}>
            {tipos.map(({ key, icon, label }) => (
              <div key={key} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 0',borderBottom:'1px solid var(--border)'}}>
                <Icon name={icon} size={14}/>
                <span style={{flex:1,fontSize:13}}>{label}</span>
                <button
                  type="button"
                  onClick={() => toggle(key)}
                  style={{
                    background: local[key] ? 'var(--accent)' : 'var(--border)',
                    color: local[key] ? '#fff' : 'var(--text)',
                    border: 'none', borderRadius: 12, padding: '3px 12px',
                    fontSize: 12, cursor: 'pointer',
                  }}>
                  {local[key] ? 'Ativo' : 'Inativo'}
                </button>
              </div>
            ))}
          </div>
          <div style={{display:'flex',gap:8,justifyContent:'flex-end',paddingTop:12}}>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleSave}
              disabled={mutation.isPending}>
              {mutation.isPending ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

// ---------- Atalhos de teclado ----------
const kbdStyle = {
  display: 'inline-block', padding: '2px 6px', minWidth: 22, textAlign: 'center',
  background: '#fff', border: '1px solid var(--border)', borderBottom: '2px solid var(--border)',
  borderRadius: 4, fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--text-2)',
  boxShadow: '0 1px 0 rgba(0,0,0,0.04)',
};

export function FormAtalhos({ onClose }) {
  const grupos = [
    {
      titulo: 'Busca e navegação',
      atalhos: [
        [['⌘K ou Ctrl+K'], 'Abrir busca global'],
        [['Esc'], 'Fechar busca'],
        [['?'], 'Mostrar este painel'],
      ],
    },
    {
      titulo: 'Assistente e modais',
      atalhos: [
        [['⌘/ ou Ctrl+/'], 'Abrir/fechar o assistente'],
        [['Enter'], 'Enviar mensagem no chat'],
        [['Shift', 'Enter'], 'Nova linha na mensagem'],
        [['Esc'], 'Fechar modal / cancelar'],
      ],
    },
  ];
  return (
    <Modal title="Atalhos de teclado" sub="Atalhos disponíveis no ResQui · pressione ? a qualquer momento"
      onClose={onClose} width={680}
      footer={<button type="button" className="btn btn-sm" onClick={onClose}>Fechar</button>}>
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18}}>
        {grupos.map(g => (
          <div key={g.titulo}>
            <div style={pgrsSub}>{g.titulo}</div>
            <div style={{display: 'flex', flexDirection: 'column'}}>
              {g.atalhos.map(([keys, desc]) => (
                <div key={desc} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)', gap: 8}}>
                  <span style={{fontSize: 12, color: 'var(--text-2)'}}>{desc}</span>
                  <span style={{display: 'flex', gap: 3}}>
                    {keys.map((k) => (
                      <kbd key={k} style={kbdStyle}>{k}</kbd>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

// ---------- Documentação ----------
export function FormDocs({ onClose }) {
  const [busca, setBusca] = useState('');
  const docs = [
    { sec: 'Primeiros passos', items: [
      ['Tour pelo ResQui em 5 minutos', '5 min', 'vídeo'],
      ['Cadastrando seu primeiro reagente', '3 min', 'tutorial'],
      ['Estrutura do inventário (lotes, frascos, embalagens)', '7 min', 'guia'],
    ]},
    { sec: 'Operação diária', items: [
      ['Registrando resíduos no Lab', '6 min', 'guia'],
      ['Imprimindo rótulos GHS conforme NBR 14725', '4 min', 'guia'],
      ['Como usar o motor de compatibilidade', '8 min', 'guia'],
    ]},
    { sec: 'Conformidade', items: [
      ['PGRS — estrutura obrigatória (Lei 12.305 art. 21)', '15 min', 'referência'],
      ['Auditoria — interpretando o log de eventos', '5 min', 'guia'],
      ['Relatórios para PF/Exército (controlados)', '7 min', 'guia'],
    ]},
    { sec: 'Administração', items: [
      ['Papéis e permissões (RBAC)', '10 min', 'guia'],
      ['Papéis, políticas de autorização e sessões', '8 min', 'guia'],
      ['API REST do ResQui · OAuth 2.0', '20 min', 'referência'],
    ]},
    { sec: 'Assistente', items: [
      ['Comandos suportados pelo chat', '4 min', 'referência'],
      ['Exemplos de prompts úteis', '3 min', 'guia'],
    ]},
  ];
  const q = busca.trim().toLowerCase();
  const filtrado = docs.flatMap(s => {
    const items = s.items.filter(([t]) => !q || t.toLowerCase().includes(q));
    return items.length ? [{...s, items}] : [];
  });

  return (
    <Modal title="Documentação · ResQui" sub="Guias, vídeos e referências técnicas"
      onClose={onClose} width={680}
      footer={<>
        <button type="button" className="btn btn-sm" onClick={onClose}>Fechar</button>
        <button type="button" className="btn btn-sm"><Icon name="upload" size={12}/> Abrir docs.instituto.example/resqui</button>
      </>}>
      <div className="input" style={{marginBottom: 14}}>
        <Icon name="search" size={14}/>
        <input placeholder="Buscar na documentação…" value={busca} onChange={e => setBusca(e.target.value)} aria-label="Buscar na documentação"/>
      </div>

      {filtrado.length === 0 ? (
        <div style={{padding: 30, textAlign: 'center', color: 'var(--text-3)', fontSize: 13}}>
          Nenhum artigo encontrado para "{busca}".
          <div style={{marginTop: 8, fontSize: 12}}>Tente termos como <em>MTR, rótulo, compatibilidade, PGRS</em>.</div>
        </div>
      ) : filtrado.map(g => (
        <div key={g.sec} style={{marginBottom: 14}}>
          <div style={pgrsSub}>{g.sec}</div>
          {g.items.map(([titulo, tempo, tipo]) => (
            <div key={titulo} style={{display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px', borderTop: '1px solid var(--border)', cursor: 'pointer'}}>
              <Icon name={tipo === 'vídeo' ? 'sparkle' : tipo === 'referência' ? 'book' : 'clipboard'} size={14}/>
              <span style={{flex: 1, fontSize: 12.5}}>{titulo}</span>
              <span style={{fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--text-3)', textTransform: 'uppercase'}}>{tipo}</span>
              <span style={{fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--mono)', minWidth: 40, textAlign: 'right'}}>{tempo}</span>
            </div>
          ))}
        </div>
      ))}

      <div style={{marginTop: 14, padding: 12, background: 'var(--accent-soft)', border: '1px solid var(--accent-soft-2)', borderRadius: 'var(--radius)', fontSize: 12, lineHeight: 1.5}}>
        <strong>Precisa de mais ajuda?</strong> Suporte técnico: <span style={{fontFamily: 'var(--mono)'}}>suporte.resqui@instituto.example</span> · ramal 1234 · seg-sex 8h–18h.
      </div>
    </Modal>
  );
}

// ---------- Reportar problema ----------
export function FormReportar({ onClose, dispatch }) {
  const [data, setData] = useState({
    tipo: 'bug',
    severidade: 'media',
    titulo: '',
    descricao: '',
    passos: '',
    incluirContexto: true,
  });
  const [enviado, setEnviado] = useState(false);
  const mutation = useCriarChamado();
  const set = (k, v) => setData(d => ({ ...d, [k]: v }));

  const valid = data.titulo.trim().length >= 5 && data.descricao.trim().length >= 10;

  const enviar = () => {
    if (!valid) return;
    mutation.mutate(
      {
        Titulo: data.titulo.trim(),
        Descricao: data.descricao.trim() + (data.passos.trim() ? '\n\nPassos:\n' + data.passos.trim() : ''),
        LaboratorioId: null,
        Tipo: data.tipo.charAt(0).toUpperCase() + data.tipo.slice(1),
        Severidade: data.severidade.charAt(0).toUpperCase() + data.severidade.slice(1),
      },
      { onSuccess: () => setEnviado(true) }
    );
  };

  if (enviado) {
    return (
      <Modal title="Ticket criado" onClose={onClose} width={520}
        footer={<>
          <button type="button" className="btn btn-sm" onClick={() => { onClose(); dispatch({ type: 'nav', screen: 'chamados' }); }}>
            <Icon name="warning" size={12}/> Ver chamado
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={onClose}>Fechar</button>
        </>}>
        <div style={{textAlign: 'center', padding: '20px 0'}}>
          {(() => {
            const ticketSuccessIconStyle = {width: 56, height: 56, borderRadius: '50%', background: 'var(--green-soft)', color: 'var(--green)', display: 'grid', placeItems: 'center', margin: '0 auto 14px'};
            return <div style={ticketSuccessIconStyle}><Icon name="check" size={28} stroke={2.5}/></div>;
          })()}
          <div style={{fontSize: 15, fontWeight: 600, marginBottom: 6}}>Recebemos seu relato</div>
          <div style={{fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.5, maxWidth: 360, margin: '0 auto'}}>
            Seu relato foi registrado. A equipe de suporte responderá em até <strong>1 dia útil</strong>.
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Reportar problema" sub="Ajude-nos a melhorar o ResQui"
      onClose={onClose} width={620}
      footer={<>
        <button type="button" className="btn btn-sm" onClick={onClose}>Cancelar</button>
        <button type="button" className="btn btn-primary btn-sm" disabled={!valid || mutation.isPending} onClick={enviar}>
          <Icon name="send" size={12}/> {mutation.isPending ? 'Enviando…' : 'Enviar relato'}
        </button>
      </>}>
      <div className="form-row">
        <div className="field">
          <label htmlFor="reportar-tipo">Tipo</label>
          <select id="reportar-tipo" value={data.tipo} onChange={e => set('tipo', e.target.value)}>
            <option value="bug">🐛 Bug · algo não funcionou</option>
            <option value="feature">💡 Sugestão · nova funcionalidade</option>
            <option value="ui">🎨 Interface · problema visual ou de usabilidade</option>
            <option value="performance">⚡ Performance · sistema lento</option>
            <option value="conformidade">📋 Conformidade · norma ou regra incorreta</option>
            <option value="outro">Outro</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="reportar-severidade">Severidade</label>
          <select id="reportar-severidade" value={data.severidade} onChange={e => set('severidade', e.target.value)}>
            <option value="baixa">Baixa · incômodo menor</option>
            <option value="media">Média · atrapalha o uso</option>
            <option value="alta">Alta · bloqueia operação</option>
            <option value="critica">Crítica · risco regulatório/segurança</option>
          </select>
        </div>
      </div>
      <div className="form-row full">
        <div className="field">
          <label htmlFor="reportar-titulo">Título <span style={{color: 'var(--text-3)', fontWeight: 400}}>(mín. 5 caracteres)</span></label>
          <input id="reportar-titulo" aria-label="Título do problema" value={data.titulo} onChange={e => set('titulo', e.target.value)} placeholder="Ex: Botão de salvar rascunho não persiste após reload"/>
        </div>
      </div>
      <div className="form-row full">
        <div className="field">
          <label htmlFor="reportar-descricao">Descrição <span style={{color: 'var(--text-3)', fontWeight: 400}}>(o que aconteceu e o que esperava)</span></label>
          <textarea id="reportar-descricao" aria-label="Descrição do problema" value={data.descricao} onChange={e => set('descricao', e.target.value)} rows={4}
            placeholder="Descreva o problema com o máximo de detalhes possível…"
            style={{resize: 'vertical', fontFamily: 'var(--font)', lineHeight: 1.45}}/>
        </div>
      </div>
      <div className="form-row full">
        <div className="field">
          <label htmlFor="reportar-passos">Passos para reproduzir <span style={{color: 'var(--text-3)', fontWeight: 400}}>(opcional)</span></label>
          <textarea id="reportar-passos" aria-label="Passos para reproduzir" value={data.passos} onChange={e => set('passos', e.target.value)} rows={3}
            placeholder={'1. Abrir tela X\n2. Clicar em Y\n3. ...'}
            style={{resize: 'vertical', fontFamily: 'var(--mono)', lineHeight: 1.45, fontSize: 12}}/>
        </div>
      </div>

      <label style={{...pgrsCheck, marginTop: 4}}>
        <input type="checkbox" aria-label="Incluir dados de contexto automaticamente" checked={data.incluirContexto} onChange={() => set('incluirContexto', !data.incluirContexto)}/>
        <span>
          Incluir dados de contexto automaticamente
          <div style={{fontSize: 12, color: 'var(--text-3)', marginTop: 2}}>
            Versão do app, navegador, tela aberta, último ID acessado · nenhum dado sensível
          </div>
        </span>
      </label>
    </Modal>
  );
}
