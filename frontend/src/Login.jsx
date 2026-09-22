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
            <div className="brand-sub">Gestão de resíduos químicos</div>
          </div>
        </div>

        <div className="login-side-body">
          <h1 className="login-headline">
            Rastreabilidade do berço ao destino para laboratórios de pesquisa e ensino.
          </h1>
          <p className="login-lede">
            Inventário de reagentes, compatibilidade química, descarte rastreado e manifestos de coleta — num só lugar.
          </p>
        </div>

        <div className="login-side-foot mono">
          © 2026 ResQui
        </div>
      </aside>

      <main className="login-main">
        <div className="login-card">
          <div className="login-card-head">
            <h2 className="login-card-title">Entrar no ResQui</h2>
            <p className="login-card-sub">
              Use suas credenciais institucionais
            </p>
          </div>

          <form onSubmit={submit}>
            <div className="field login-field">
              <label htmlFor="login-email">E-mail institucional</label>
              <input id="login-email" type="email" aria-label="E-mail institucional" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="nome@instituicao.br"/>
            </div>

            <div className="field login-field">
              <label htmlFor="login-senha">Senha</label>
              <input id="login-senha" type="password" aria-label="Senha" value={senha} onChange={e => setSenha(e.target.value)} placeholder="••••••••" disabled={precisa2fa}/>
            </div>

            {precisa2fa && (
              <div className="field login-field">
                <label htmlFor="login-2fa">Código de verificação (2FA)</label>
                <input id="login-2fa" inputMode="numeric" autoComplete="one-time-code" aria-label="Código de verificação"
                  value={codigo2fa} onChange={e => setCodigo2fa(e.target.value)} placeholder="000000" autoFocus/>
                <div className="login-hint">
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
