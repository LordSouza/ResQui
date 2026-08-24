// Tela de login
import { useState } from 'react';
import { Icon } from './components';
import { useLogin } from './auth/useLogin';

export function LoginScreen() {
  const [email, setEmail] = useState('admin@resqui.local');
  const [senha, setSenha] = useState('');
  const [codigo2fa, setCodigo2fa] = useState('');
  const [precisa2fa, setPrecisa2fa] = useState(false);
  const loginMutation = useLogin();

  const submit = (e) => {
    e?.preventDefault();
    if (!email || !senha) return;
    if (!email.includes('@')) return;
    if (precisa2fa && !codigo2fa) return;
    loginMutation.mutate({ email, senha, codigo2fa }, {
      onSuccess: (data) => { if (data?.requires2fa) setPrecisa2fa(true); },
    });
  };

  const loading = loginMutation.isPending;
  const err = loginMutation.isError ? (loginMutation.error?.message ?? 'E-mail ou senha incorretos.') : '';

  return (
    <div className="login-shell">
      <aside className="login-side">
        <div className="login-brand">
          <div className="logo">Rq</div>
          <div>
            <div className="brand-name">ResQui</div>
          </div>
        </div>

        <div className="login-side-body">
          <div className="mono" style={{fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.6, marginBottom: 14}}>
            Sistema de Gestão de Resíduos Químicos
          </div>
          <h1 style={{fontSize: 26, fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.15, margin: '0 0 12px'}}>
            Rastreabilidade do berço ao destino para laboratórios de pesquisa e ensino.
          </h1>
          <p style={{fontSize: 13, opacity: 0.75, lineHeight: 1.5, margin: 0}}>
            Inventário de reagentes, compatibilidade química, descarte rastreado e manifestos de coleta — num só lugar.
          </p>
        </div>

        <div className="login-side-foot mono">
          © 2026 ResQui
        </div>
      </aside>

      <main className="login-main">
        <div className="login-card">
          <div style={{textAlign: 'center', marginBottom: 24}}>
            <div className="mono" style={{fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 8}}>
              Acesso ao sistema
            </div>
            <h2 style={{fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em', margin: 0}}>Entrar no ResQui</h2>
            <p style={{fontSize: 12.5, color: 'var(--text-2)', margin: '6px 0 0'}}>
              Use suas credenciais institucionais
            </p>
          </div>

          <form onSubmit={submit}>
            <div className="field" style={{marginBottom: 14}}>
              <label htmlFor="login-email">E-mail institucional</label>
              <input id="login-email" type="email" aria-label="E-mail institucional" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seunome@instituto.example"/>
            </div>

            <div className="field" style={{marginBottom: 8}}>
              <label htmlFor="login-senha" style={{display: 'flex', justifyContent: 'space-between'}}>
                <span>Senha</span>
                <button type="button" className="login-forgot-btn">Esqueci minha senha</button>
              </label>
              <input id="login-senha" type="password" aria-label="Senha" value={senha} onChange={e => setSenha(e.target.value)} placeholder="••••••••" disabled={precisa2fa}/>
            </div>

            {precisa2fa && (
              <div className="field" style={{marginBottom: 8}}>
                <label htmlFor="login-2fa">Código de verificação (2FA)</label>
                <input id="login-2fa" inputMode="numeric" autoComplete="one-time-code" aria-label="Código de verificação"
                  value={codigo2fa} onChange={e => setCodigo2fa(e.target.value)} placeholder="000000" autoFocus/>
                <div style={{fontSize: 12, color: 'var(--text-2)', marginTop: 6}}>
                  Sem acesso ao autenticador? Informe um dos seus códigos de recuperação.
                </div>
              </div>
            )}

            {err && (
              <div className="login-err">
                <Icon name="warning" size={13}/> {err}
              </div>
            )}

            <button type="submit" className="btn btn-primary login-submit-btn"
              disabled={loading}>
              {loading ? 'Autenticando…' : precisa2fa ? 'Verificar código' : 'Entrar'} {!loading && <Icon name="chevron_right" size={14}/>}
            </button>
          </form>

          <div className="login-foot">
            <span>Não tem acesso? Solicite ao responsável do seu laboratório.</span>
          </div>
        </div>
      </main>
    </div>
  );
}
