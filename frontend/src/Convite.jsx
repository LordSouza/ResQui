import { useState } from 'react';
import { Icon } from './components';
import { ROLES } from './data';
import { useConvite } from './convites/useConvite';
import { useAceitarConvite } from './convites/useAceitarConvite';
import { useLogin } from './auth/useLogin';

export function ConviteScreen({ token, onConcluido }) {
  const convite = useConvite(token);
  const aceitar = useAceitarConvite();
  const login = useLogin();
  const [f, setF] = useState({ nome: '', email: '', matricula: '', senha: '', confirmacao: '' });
  const [erroLocal, setErroLocal] = useState('');
  const upd = (k, v) => setF(s => ({ ...s, [k]: v }));

  const submit = (e) => {
    e?.preventDefault();
    setErroLocal('');
    if (!f.nome.trim() || !f.email.trim() || !f.senha) {
      setErroLocal('Nome, e-mail e senha são obrigatórios.');
      return;
    }
    if (!f.email.includes('@')) {
      setErroLocal('E-mail inválido.');
      return;
    }
    if (f.senha !== f.confirmacao) {
      setErroLocal('A confirmação não confere com a senha.');
      return;
    }
    aceitar.mutate(
      { token, Nome: f.nome.trim(), Email: f.email.trim(), Matricula: f.matricula.trim() || null, Senha: f.senha },
      { onSuccess: () => login.mutate({ email: f.email.trim(), senha: f.senha }, { onSuccess: () => onConcluido?.() }) },
    );
  };

  const papelLabel = ROLES[convite.data?.papel]?.label ?? convite.data?.papel;
  const processando = aceitar.isPending || login.isPending || login.isSuccess;
  const contaCriadaSemLogin = aceitar.isSuccess && login.isError;
  const erro = erroLocal
    || (aceitar.isError ? aceitar.error?.message : '')
    || (login.isError ? login.error?.message : '');

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
            Convite de acesso
          </div>
          <h1 style={{fontSize: 26, fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.15, margin: '0 0 12px'}}>
            Crie sua conta e escolha a sua própria senha.
          </h1>
          <p style={{fontSize: 13, opacity: 0.75, lineHeight: 1.5, margin: 0}}>
            Quem convidou você não vê a senha que você definir aqui.
          </p>
        </div>

        <div className="login-side-foot mono">
          © 2026 ResQui
        </div>
      </aside>

      <main className="login-main">
        <div className="login-card">
          {convite.isPending && (
            <div className="page-loading"><Icon name="refresh" size={16}/> Verificando convite…</div>
          )}

          {convite.isError && (
            <div style={{textAlign: 'center'}}>
              <h2 style={{fontSize: 22, fontWeight: 600, margin: '0 0 8px'}}>Convite indisponível</h2>
              <p style={{fontSize: 13, color: 'var(--text-2)', margin: '0 0 18px'}}>
                Este link é inválido, já foi utilizado ou expirou. Peça um novo a quem convidou você.
              </p>
              <button type="button" className="btn btn-sm" onClick={() => onConcluido?.()}>Ir para o login</button>
            </div>
          )}

          {contaCriadaSemLogin && (
            <div style={{textAlign: 'center'}}>
              <h2 style={{fontSize: 22, fontWeight: 600, margin: '0 0 8px'}}>Conta criada</h2>
              <p style={{fontSize: 13, color: 'var(--text-2)', margin: '0 0 6px'}}>
                Sua conta já existe, mas não conseguimos entrar automaticamente: {login.error?.message}
              </p>
              <p style={{fontSize: 13, color: 'var(--text-2)', margin: '0 0 18px'}}>
                Entre com o e-mail e a senha que você acabou de cadastrar. Este convite já foi usado.
              </p>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => onConcluido?.()}>Ir para o login</button>
            </div>
          )}

          {convite.isSuccess && !contaCriadaSemLogin && (
            <>
              <div style={{textAlign: 'center', marginBottom: 24}}>
                <div className="mono" style={{fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 8}}>
                  Convite para {papelLabel}
                </div>
                <h2 style={{fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em', margin: 0}}>Criar sua conta</h2>
                <p style={{fontSize: 12.5, color: 'var(--text-2)', margin: '6px 0 0'}}>
                  Preencha seus dados para entrar no ResQui
                </p>
              </div>

              <form onSubmit={submit}>
                <div className="field" style={{marginBottom: 14}}>
                  <label htmlFor="convite-nome">Nome completo</label>
                  <input id="convite-nome" value={f.nome} onChange={e => upd('nome', e.target.value)} placeholder="Ana Lima"/>
                </div>

                <div className="field" style={{marginBottom: 14}}>
                  <label htmlFor="convite-email">E-mail institucional</label>
                  <input id="convite-email" type="email" value={f.email} onChange={e => upd('email', e.target.value)} placeholder="nome@instituicao.br"/>
                </div>

                <div className="field" style={{marginBottom: 14}}>
                  <label htmlFor="convite-matricula">Matrícula</label>
                  <input id="convite-matricula" value={f.matricula} onChange={e => upd('matricula', e.target.value)} placeholder="2024000123"/>
                </div>

                <div className="field" style={{marginBottom: 14}}>
                  <label htmlFor="convite-senha">Senha</label>
                  <input id="convite-senha" type="password" value={f.senha} onChange={e => upd('senha', e.target.value)} placeholder="••••••••"/>
                  <div style={{fontSize: 12, color: 'var(--text-2)', marginTop: 6}}>
                    Mínimo de 8 caracteres, com maiúscula, minúscula, número e símbolo.
                  </div>
                </div>

                <div className="field" style={{marginBottom: 8}}>
                  <label htmlFor="convite-confirmacao">Confirmar senha</label>
                  <input id="convite-confirmacao" type="password" value={f.confirmacao} onChange={e => upd('confirmacao', e.target.value)} placeholder="••••••••"/>
                </div>

                {erro && (
                  <div className="login-err">
                    <Icon name="warning" size={13}/> {erro}
                  </div>
                )}

                <button type="submit" className="btn btn-primary login-submit-btn" disabled={processando}>
                  {processando ? 'Criando conta…' : 'Criar conta e entrar'} {!processando && <Icon name="chevron_right" size={14}/>}
                </button>
              </form>

              <div className="login-foot">
                <span>Já tem conta? <button type="button" className="link" onClick={() => onConcluido?.()}>Entrar</button></span>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
