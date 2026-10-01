// Tela de login
import { useState } from 'react';
import { Icon } from './components';
import { useLogin } from './auth/useLogin';
import { useSolicitarRedefinicao } from './auth/useRedefinicaoSenha';
import { URL_DO_BLOG } from './lib/tutoriais';

export function LoginScreen({ aviso = '' }) {
  const [email, setEmail] = useState('admin@resqui.local');
  const [senha, setSenha] = useState('');
  const [codigo2fa, setCodigo2fa] = useState('');
  const [precisa2fa, setPrecisa2fa] = useState(false);
  const [esqueceuSenha, setEsqueceuSenha] = useState(false);
  const loginMutation = useLogin();
  const solicitarRedefinicao = useSolicitarRedefinicao();

  const submit = (e) => {
    e?.preventDefault();
    if (!email || !senha) return;
    if (!email.includes('@')) return;
    if (precisa2fa && !codigo2fa) return;
    loginMutation.mutate({ email, senha, codigo2fa }, {
      onSuccess: (data) => { if (data?.requires2fa) setPrecisa2fa(true); },
    });
  };

  const pedirLink = (e) => {
    e?.preventDefault();
    if (!email.includes('@')) return;
    solicitarRedefinicao.mutate(email.trim());
  };

  const alternarEsqueceuSenha = (valor) => {
    solicitarRedefinicao.reset();
    setEsqueceuSenha(valor);
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
          {esqueceuSenha ? (
            <FormEsqueciSenha
              email={email}
              onEmail={setEmail}
              onSubmit={pedirLink}
              solicitacao={solicitarRedefinicao}
              onVoltar={() => alternarEsqueceuSenha(false)}
            />
          ) : (
            <>
              <div className="login-card-head">
                <h2 className="login-card-title">Entrar no ResQui</h2>
                <p className="login-card-sub">
                  Use suas credenciais institucionais
                </p>
              </div>

              {aviso && !err && (
                <div className="login-ok" role="status">
                  <Icon name="check" size={13}/> {aviso}
                </div>
              )}

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

              <button type="button" className="link login-esqueci" onClick={() => alternarEsqueceuSenha(true)}>
                Esqueci minha senha
              </button>
            </>
          )}

          <div className="login-foot">
            <span>Não tem acesso? Solicite ao responsável do seu laboratório.</span>
            <a className="login-foot-tutoriais" href={URL_DO_BLOG} target="_blank" rel="noopener noreferrer">
              <Icon name="book" size={13}/> Como usar o ResQui
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}

function FormEsqueciSenha({ email, onEmail, onSubmit, solicitacao, onVoltar }) {
  return (
    <>
      <div className="login-card-head">
        <h2 className="login-card-title">Esqueci minha senha</h2>
        <p className="login-card-sub">
          Enviamos um link para você escolher uma senha nova
        </p>
      </div>

      {solicitacao.isSuccess ? (
        <div className="login-ok" role="status">
          <Icon name="check" size={13}/> Se houver uma conta com esse e-mail, enviamos um link válido por 1 hora.
        </div>
      ) : (
        <form onSubmit={onSubmit}>
          <div className="field login-field">
            <label htmlFor="esqueci-email">E-mail da conta</label>
            <input id="esqueci-email" type="email" value={email}
              onChange={e => onEmail(e.target.value)}
              placeholder="nome@instituicao.br" autoFocus/>
          </div>

          {solicitacao.isError && (
            <div className="login-err">
              <Icon name="warning" size={13}/> {solicitacao.error?.message}
            </div>
          )}

          <button type="submit" className="btn btn-primary login-submit-btn" disabled={solicitacao.isPending}>
            {solicitacao.isPending ? 'Enviando…' : 'Enviar link'} {!solicitacao.isPending && <Icon name="chevron_right" size={14}/>}
          </button>
        </form>
      )}

      <button type="button" className="link login-esqueci" onClick={onVoltar}>
        Voltar para o login
      </button>
    </>
  );
}
