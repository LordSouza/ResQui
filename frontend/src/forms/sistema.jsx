import { useState, useEffect } from 'react';
import { Icon, Badge } from '../components';
import { AUDITORIA } from '../data';
import { pgrsTs } from '../utils';
import Modal from './Modal';
import { useGetNotificacaoPrefs } from '../notificacoes/useGetNotificacaoPrefs';
import { useNotificacaoPrefs } from '../notificacoes/useNotificacaoPrefs';

const pgrsHint = { fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5, marginBottom: 14, padding: '8px 10px', background: 'var(--surface-2)', borderRadius: 'var(--radius)', borderLeft: '3px solid var(--accent)' };
const pgrsSub = { fontSize: 12, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', marginBottom: 8, marginTop: 4 };
const pgrsCheck = { display: 'flex', gap: 8, alignItems: 'center', fontSize: 12.5, padding: '4px 0', cursor: 'pointer' };

// ---------- Conta: Perfil ----------
export function FormPerfil({ onClose, dispatch }) {
  const [data, setData] = useState({
    nome: 'Lucas Souza',
    email: 'lucas.souza@instituto.example',
    siape: '1834521',
    crq: 'CRQ 00-00001',
    departamento: 'Instituto de Matemática e Computação · IMC',
    cargo: 'Administrador do sistema',
    telefone: '(00) 90000-0000',
    bio: 'Responsável técnico pela operação do ResQui no IMC. Apoio a auditorias FEAM e relatórios PGRS.',
  });
  const set = (k, v) => setData(d => ({ ...d, [k]: v }));
  const save = () => {
    AUDITORIA.unshift({
      ts: pgrsTs(), who: 'Lucas Souza', what: 'user.profile', where: '-',
      detail: 'Atualizou dados do perfil', risk: 'low',
    });
    dispatch({ type: 'refresh' });
    onClose();
  };
  const avatarStyle = {
    width: 80, height: 80, borderRadius: '50%', background: 'var(--accent)',
    color: '#fff', display: 'grid', placeItems: 'center', fontSize: 28, fontWeight: 600,
    flexShrink: 0,
  };
  return (
    <Modal title="Perfil" sub="Dados pessoais e vínculo institucional" onClose={onClose} width={600}
      footer={<>
        <button type="button" className="btn btn-sm" onClick={onClose}>Cancelar</button>
        <button type="button" className="btn btn-primary btn-sm" onClick={save}><Icon name="check" size={12}/> Salvar alterações</button>
      </>}>
      <div style={{display: 'flex', gap: 18, alignItems: 'flex-start', marginBottom: 18}}>
        <div style={avatarStyle}>LS</div>
        <div style={{flex: 1}}>
          <div style={{fontSize: 12, fontWeight: 600, marginBottom: 4}}>Foto de perfil</div>
          <div style={{fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5, marginBottom: 8}}>
            Recomendado: PNG ou JPG, mínimo 200×200px, fundo claro. Tamanho máximo 2 MB.
          </div>
          <div style={{display: 'flex', gap: 6}}>
            <button type="button" className="btn btn-sm"><Icon name="upload" size={12}/> Enviar foto</button>
            <button type="button" className="btn btn-sm">Remover</button>
          </div>
        </div>
      </div>

      <div className="form-row">
        <div className="field"><label htmlFor="perfil-nome">Nome completo</label>
          <input id="perfil-nome" aria-label="Nome completo" value={data.nome} onChange={e => set('nome', e.target.value)}/></div>
        <div className="field"><label htmlFor="perfil-siape">SIAPE</label>
          <input id="perfil-siape" aria-label="SIAPE" value={data.siape} onChange={e => set('siape', e.target.value)} style={{fontFamily: 'var(--mono)'}}/></div>
      </div>
      <div className="form-row">
        <div className="field"><label htmlFor="perfil-email">E-mail institucional</label>
          <input id="perfil-email" aria-label="E-mail institucional" value={data.email} onChange={e => set('email', e.target.value)} style={{fontFamily: 'var(--mono)'}}/></div>
        <div className="field"><label htmlFor="perfil-telefone">Telefone</label>
          <input id="perfil-telefone" aria-label="Telefone" value={data.telefone} onChange={e => set('telefone', e.target.value)} style={{fontFamily: 'var(--mono)'}}/></div>
      </div>
      <div className="form-row">
        <div className="field"><label htmlFor="perfil-departamento">Departamento / Unidade</label>
          <input id="perfil-departamento" aria-label="Departamento / Unidade" value={data.departamento} onChange={e => set('departamento', e.target.value)}/></div>
        <div className="field"><label htmlFor="perfil-crq">Registro CRQ</label>
          <input id="perfil-crq" aria-label="Registro CRQ" value={data.crq} onChange={e => set('crq', e.target.value)} style={{fontFamily: 'var(--mono)'}}/></div>
      </div>
      <div className="form-row full">
        <div className="field"><label htmlFor="perfil-cargo">Cargo</label>
          <input id="perfil-cargo" aria-label="Cargo" value={data.cargo} onChange={e => set('cargo', e.target.value)}/></div>
      </div>
      <div className="form-row full">
        <div className="field"><label htmlFor="perfil-bio">Bio / Observações</label>
          <textarea id="perfil-bio" aria-label="Bio / Observações" value={data.bio} onChange={e => set('bio', e.target.value)} rows={3}
            style={{resize: 'vertical', fontFamily: 'var(--font)', lineHeight: 1.45}}/></div>
      </div>
    </Modal>
  );
}

// ---------- Senha e 2FA ----------
export function FormSenha2FA({ onClose, dispatch }) {
  const [aba, setAba] = useState('senha');
  const [pwd, setPwd] = useState({ atual: '', nova: '', conf: '' });
  const [mfaEnabled, setMfaEnabled] = useState(true);

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

  const salvar = () => {
    AUDITORIA.unshift({
      ts: pgrsTs(), who: 'Lucas Souza', what: 'user.password.change', where: '-',
      detail: 'Alterou a senha de acesso', risk: 'med',
    });
    dispatch({ type: 'refresh' });
    onClose();
  };

  return (
    <Modal title="Senha e autenticação" sub="Credenciais de acesso e MFA"
      onClose={onClose} width={620}
      footer={aba === 'senha' ? <>
        <button type="button" className="btn btn-sm" onClick={onClose}>Cancelar</button>
        <button type="button" className="btn btn-primary btn-sm" disabled={!validPwd} onClick={salvar}>
          <Icon name="check" size={12}/> Alterar senha
        </button>
      </> : <button type="button" className="btn btn-sm" onClick={onClose}>Fechar</button>}>
      <div className="tabs">
        <button type="button" className={`tab ${aba === 'senha' ? 'active' : ''}`} onClick={() => setAba('senha')}>Senha</button>
        <button type="button" className={`tab ${aba === 'mfa' ? 'active' : ''}`} onClick={() => setAba('mfa')}>Autenticação em dois fatores</button>
      </div>

      {aba === 'senha' && (
        <div>
          <div style={pgrsHint}>Última alteração há <strong>47 dias</strong>. Política institucional exige troca a cada 90 dias.</div>
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
              <li>Mínimo 8 caracteres (recomendado 12+)</li>
              <li>Combinar letras maiúsculas, minúsculas e números</li>
              <li>Pelo menos 1 caractere especial</li>
              <li>Não pode coincidir com as 5 últimas senhas</li>
            </ul>
          </div>
        </div>
      )}

      {aba === 'mfa' && (
        <div>
          {(() => {
            const mfaStatusStyle = {display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: 12, background: mfaEnabled ? 'var(--green-soft)' : 'var(--amber-soft)', border: `1px solid ${mfaEnabled ? '#b8dec7' : '#efd9a4'}`, borderRadius: 'var(--radius)', marginBottom: 14};
            return (
              <div style={mfaStatusStyle}>
                <div>
                  <div style={{fontSize: 13, fontWeight: 600, color: mfaEnabled ? 'var(--green)' : 'var(--amber)'}}>
                    <Icon name="shield" size={13}/> 2FA {mfaEnabled ? 'ativo' : 'desativado'}
                  </div>
                  <div style={{fontSize: 12, color: 'var(--text-2)', marginTop: 4}}>
                    {mfaEnabled
                      ? 'Sua conta exige um segundo fator a cada login. Método ativo: Aplicativo autenticador.'
                      : 'Recomendado para administradores. Sem 2FA, a conta fica vulnerável a vazamento de senha.'}
                  </div>
                </div>
                <button type="button" className="btn btn-sm" onClick={() => setMfaEnabled(m => !m)}>
                  {mfaEnabled ? 'Desativar' : 'Ativar 2FA'}
                </button>
              </div>
            );
          })()}

          {mfaEnabled && (
            <>
              <div style={pgrsSub}>Métodos configurados</div>
              <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
                {[
                  { ic: 'shield', nome: 'Google Authenticator', detalhe: 'iPhone 14 · cadastrado em 03/jul/2025', ativo: true },
                  { ic: 'bell', nome: 'SMS · (35) ••••-5432', detalhe: 'Backup · usar se app indisponível', ativo: true },
                  { ic: 'clipboard', nome: 'Códigos de recuperação', detalhe: '8 de 10 códigos restantes', ativo: true },
                ].map((m) => (
                  <div key={m.nome} style={{display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius)'}}>
                    <Icon name={m.ic} size={16}/>
                    <div style={{flex: 1}}>
                      <div style={{fontSize: 12.5, fontWeight: 500}}>{m.nome}</div>
                      <div style={{fontSize: 12, color: 'var(--text-3)'}}>{m.detalhe}</div>
                    </div>
                    <Badge kind="green" dot>Ativo</Badge>
                  </div>
                ))}
              </div>
              <button type="button" className="btn btn-sm" style={{marginTop: 12}}><Icon name="plus" size={12}/> Adicionar método</button>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}

// ---------- Sessões ativas ----------
export function FormSessoes({ onClose, dispatch }) {
  const [sessoes, setSessoes] = useState([
    {
      id: 1, atual: true, dispositivo: 'MacBook Pro · Chrome 132',
      so: 'macOS Sequoia 15.2', ip: '177.106.84.21',
      local: 'Itajubá/MG · Brasil (UNIFEI · VPN institucional)',
      iniciado: '2025-11-21 07:42', ultima: 'agora',
    },
    {
      id: 2, atual: false, dispositivo: 'iPhone 14 · Safari Mobile',
      so: 'iOS 18.1', ip: '189.34.221.7',
      local: 'Itajubá/MG · Brasil',
      iniciado: '2025-11-19 18:15', ultima: '4h atrás',
    },
  ]);

  const encerrar = (id) => {
    setSessoes(s => s.filter(x => x.id !== id));
    AUDITORIA.unshift({
      ts: pgrsTs(), who: 'Lucas Souza', what: 'user.session.revoke', where: '-',
      detail: `Encerrou sessão ID ${id}`, risk: 'med',
    });
    dispatch({ type: 'refresh' });
  };

  const encerrarTodas = () => {
    setSessoes(s => s.filter(x => x.atual));
    AUDITORIA.unshift({
      ts: pgrsTs(), who: 'Lucas Souza', what: 'user.session.revoke_all', where: '-',
      detail: 'Encerrou todas as outras sessões ativas', risk: 'med',
    });
    dispatch({ type: 'refresh' });
  };

  const outras = sessoes.filter(s => !s.atual).length;

  return (
    <Modal title="Sessões ativas" sub="Dispositivos atualmente conectados à sua conta"
      onClose={onClose} width={620}
      footer={<>
        <button type="button" className="btn btn-sm" onClick={onClose}>Fechar</button>
        {outras > 0 && (
          <button type="button" className="btn btn-sm" onClick={encerrarTodas} style={{color: 'var(--red)', borderColor: 'var(--red)'}}>
            <Icon name="close" size={12}/> Encerrar {outras} outra{outras > 1 ? 's' : ''}
          </button>
        )}
      </>}>
      <div style={pgrsHint}>
        Se você não reconhece alguma sessão, encerre-a imediatamente e <strong>altere sua senha</strong>.
      </div>
      <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
        {sessoes.map(s => (
          <div key={s.id} style={{
            padding: 12, border: `1px solid ${s.atual ? 'var(--accent-soft-2)' : 'var(--border)'}`,
            background: s.atual ? 'var(--accent-soft)' : '#fff',
            borderRadius: 'var(--radius)',
          }}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12}}>
              <div style={{flex: 1}}>
                <div style={{display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6}}>
                  <span style={{fontSize: 13, fontWeight: 600}}>{s.dispositivo}</span>
                  {s.atual && <Badge kind="blue" dot>Sessão atual</Badge>}
                </div>
                <div style={{display: 'grid', gridTemplateColumns: '90px 1fr', gap: '3px 10px', fontSize: 12}}>
                  <span style={{color: 'var(--text-3)'}}>Sistema</span><span>{s.so}</span>
                  <span style={{color: 'var(--text-3)'}}>IP</span><span style={{fontFamily: 'var(--mono)'}}>{s.ip}</span>
                  <span style={{color: 'var(--text-3)'}}>Local</span><span>{s.local}</span>
                  <span style={{color: 'var(--text-3)'}}>Iniciada</span><span style={{fontFamily: 'var(--mono)'}}>{s.iniciado}</span>
                  <span style={{color: 'var(--text-3)'}}>Última atividade</span><span>{s.ultima}</span>
                </div>
              </div>
              {!s.atual && (
                <button type="button" className="btn btn-sm" onClick={() => encerrar(s.id)}
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
    { key: 'sinir',     icon: 'truck',     label: 'MTR pendente no SINIR' },
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
      titulo: 'Navegação',
      atalhos: [
        [['⌘', 'K'], 'Abrir busca global'],
        [['G', 'D'], 'Ir para Dashboard'],
        [['G', 'I'], 'Ir para Inventário'],
        [['G', 'R'], 'Ir para Resíduos'],
        [['G', 'M'], 'Ir para Pré-MTR'],
        [['G', 'A'], 'Ir para Auditoria'],
        [['?'], 'Mostrar este painel'],
      ],
    },
    {
      titulo: 'Ações rápidas',
      atalhos: [
        [['N', 'R'], 'Novo reagente'],
        [['N', 'W'], 'Novo resíduo'],
        [['N', 'M'], 'Novo Pré-MTR'],
        [['B'], 'Baixar consumo do item atual'],
        [['P'], 'Imprimir rótulo GHS'],
        [['F'], 'Abrir FISPQ'],
      ],
    },
    {
      titulo: 'Assistente MCP',
      atalhos: [
        [['⌘', '/'], 'Abrir/fechar chat MCP'],
        [['⌘', 'Enter'], 'Enviar mensagem'],
        [['Esc'], 'Fechar chat'],
      ],
    },
    {
      titulo: 'Geral',
      atalhos: [
        [['Esc'], 'Fechar modal / cancelar'],
        [['⌘', 'S'], 'Salvar rascunho'],
        [['/'], 'Focar busca da tela atual'],
        [['⌘', '⇧', 'L'], 'Sair da conta'],
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
      ['Gerando e validando Pré-MTR no SINIR', '12 min', 'guia'],
    ]},
    { sec: 'Conformidade', items: [
      ['PGRS — estrutura obrigatória (Lei 12.305 art. 21)', '15 min', 'referência'],
      ['Auditoria — interpretando o log de eventos', '5 min', 'guia'],
      ['Relatórios para PF/Exército (controlados)', '7 min', 'guia'],
    ]},
    { sec: 'Administração', items: [
      ['Papéis e permissões (RBAC)', '10 min', 'guia'],
      ['Configurando integrações (SINIR, FEAM, IBAMA)', '8 min', 'guia'],
      ['API REST do ResQui · OAuth 2.0', '20 min', 'referência'],
    ]},
    { sec: 'Assistente MCP', items: [
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
  const set = (k, v) => setData(d => ({ ...d, [k]: v }));

  const valid = data.titulo.trim().length >= 5 && data.descricao.trim().length >= 10;

  const enviar = () => {
    const ticket = 'RQ-' + Math.floor(Math.random() * 9000 + 1000);
    const novo = {
      id: ticket, tipo: data.tipo, severidade: data.severidade, status: 'aberto',
      titulo: data.titulo.trim(),
      descricao: data.descricao.trim() + (data.passos.trim() ? '\n\nPassos para reproduzir:\n' + data.passos.trim() : ''),
      reportado_por: 'Lucas Souza', reportado_por_id: 'U-001',
      criado: pgrsTs().slice(0, 16), responsavel: null,
      comentarios: [],
      contexto: data.incluirContexto ? { tela: 'desconhecida', browser: navigator.userAgent.split(') ').pop() || 'desconhecido' } : {},
    };
    if (!window.CHAMADOS) window.CHAMADOS = [];
    window.CHAMADOS.unshift(novo);
    AUDITORIA.unshift({
      ts: pgrsTs(), who: 'Lucas Souza', what: 'support.ticket', where: '-',
      detail: `Abriu ticket ${ticket}: ${data.titulo}`,
      risk: data.severidade === 'critica' ? 'high' : data.severidade === 'alta' ? 'med' : 'low',
    });
    dispatch({ type: 'refresh' });
    setEnviado(ticket);
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
            Seu ticket é <strong style={{fontFamily: 'var(--mono)'}}>{enviado}</strong>. A equipe de suporte responderá em até <strong>1 dia útil</strong> no e-mail <span style={{fontFamily: 'var(--mono)'}}>lucas.souza@instituto.example</span>.
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
        <button type="button" className="btn btn-primary btn-sm" disabled={!valid} onClick={enviar}>
          <Icon name="send" size={12}/> Enviar relato
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
