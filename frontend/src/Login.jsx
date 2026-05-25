// Tela de login
import { useState } from 'react';
import { Icon } from './components';
import { useLogin } from './auth/useLogin';

export function LoginScreen() {
  const [email, setEmail] = useState('admin@resqui.local');
  const [senha, setSenha] = useState('');
  const loginMutation = useLogin();

  const submit = (e) => {
    e?.preventDefault();
    if (!email || !senha) return;
    if (!email.includes('@')) return;
    loginMutation.mutate({ email, senha });
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
            <div className="brand-sub">UNIFEI · IMC</div>
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
            Conformidade com PNRS (Lei 12.305/2010), ABNT NBR 14725 e Resolução ANTT 5947/21. Inventário, motor de compatibilidade química, geração assistida de Pré-MTR e log de auditoria imutável.
          </p>

          <div className="login-stats">
            <div>
              <div className="num">847</div>
              <div className="lbl">itens em inventário</div>
            </div>
            <div>
              <div className="num">98<span style={{fontSize: 14}}>%</span></div>
              <div className="lbl">conformidade SINIR</div>
            </div>
            <div>
              <div className="num">12</div>
              <div className="lbl">classes de reatividade</div>
            </div>
          </div>
        </div>

        <div className="login-side-foot mono">
          © 2025 · UNIFEI · Bacharelado em Sistemas de Informação · v0.7
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
              <input id="login-senha" type="password" aria-label="Senha" value={senha} onChange={e => setSenha(e.target.value)} placeholder="••••••••"/>
            </div>

            <label style={{display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-2)', marginBottom: 18, cursor: 'pointer'}}>
              <input type="checkbox" aria-label="Manter conectado neste dispositivo" defaultChecked/>
              Manter conectado neste dispositivo
            </label>

            {err && (
              <div className="login-err">
                <Icon name="warning" size={13}/> {err}
              </div>
            )}

            <button type="submit" className="btn btn-primary login-submit-btn"
              disabled={loading}>
              {loading ? 'Autenticando…' : 'Entrar'} {!loading && <Icon name="chevron_right" size={14}/>}
            </button>
          </form>

          <div className="login-foot">
            <span>Não tem acesso? Solicite ao responsável do seu laboratório.</span>
            <div style={{marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-3)', letterSpacing: '0.04em'}}>
              Gerenciamento de usuários: controle interno UNIFEI · IMC
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
