import { useState } from 'react';
import { Icon } from './components';
import { useRedefinirSenha } from './auth/useRedefinicaoSenha';

export const AVISO_SENHA_REDEFINIDA = 'Senha redefinida. Entre com a nova senha.';

export function RedefinirSenhaScreen({ token, onConcluido }) {
  const redefinir = useRedefinirSenha();
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erroLocal, setErroLocal] = useState('');

  const submit = (e) => {
    e?.preventDefault();
    setErroLocal('');
    if (!novaSenha) {
      setErroLocal('Informe a nova senha.');
      return;
    }
    if (novaSenha !== confirmacao) {
      setErroLocal('A confirmação não confere com a senha.');
      return;
    }
    redefinir.mutate({ token, novaSenha }, { onSuccess: () => onConcluido?.(AVISO_SENHA_REDEFINIDA) });
  };

  const erro = erroLocal || (redefinir.isError ? redefinir.error?.message : '');

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
          <h1 className="login-headline">Escolha uma senha nova para a sua conta.</h1>
          <p className="login-lede">
            Ao salvar, todas as sessões abertas são encerradas. A autenticação em dois fatores, se estiver ligada, continua valendo.
          </p>
        </div>

        <div className="login-side-foot mono">
          © 2026 ResQui
        </div>
      </aside>

      <main className="login-main">
        <div className="login-card">
          <div className="login-card-head">
            <h2 className="login-card-title">Redefinir senha</h2>
            <p className="login-card-sub">O link do e-mail vale por 1 hora e só pode ser usado uma vez</p>
          </div>

          <form onSubmit={submit}>
            <div className="field login-field">
              <label htmlFor="redefinir-senha">Nova senha</label>
              <input id="redefinir-senha" type="password" autoComplete="new-password" value={novaSenha}
                onChange={e => setNovaSenha(e.target.value)} placeholder="••••••••"/>
              <div className="login-hint">
                Mínimo de 8 caracteres, com maiúscula, minúscula, número e símbolo.
              </div>
            </div>

            <div className="field login-field">
              <label htmlFor="redefinir-confirmacao">Confirmar nova senha</label>
              <input id="redefinir-confirmacao" type="password" autoComplete="new-password" value={confirmacao}
                onChange={e => setConfirmacao(e.target.value)} placeholder="••••••••"/>
            </div>

            {erro && (
              <div className="login-err">
                <Icon name="warning" size={13}/> {erro}
              </div>
            )}

            <button type="submit" className="btn btn-primary login-submit-btn" disabled={redefinir.isPending}>
              {redefinir.isPending ? 'Salvando…' : 'Salvar nova senha'} {!redefinir.isPending && <Icon name="chevron_right" size={14}/>}
            </button>
          </form>

          <div className="login-foot">
            <button type="button" className="link" onClick={() => onConcluido?.()}>Voltar para o login</button>
          </div>
        </div>
      </main>
    </div>
  );
}
