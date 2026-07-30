import { test, expect } from '@playwright/test';
import { ADMIN, apiAuth, ensureLab, totp } from './seed';

// Visualizador não pode mutar estoque/resíduos/MTRs (item: autorização fina).
test('Visualizador é bloqueado em mutações operacionais', async ({ request }) => {
  const auth = await apiAuth(request); // admin cria o usuário
  const email = `visu_${Date.now()}@resqui.local`;
  await request.post('/api/auth/register', {
    headers: auth,
    data: { Email: email, Senha: 'Visu@123', Papel: 'Visualizador', Nome: 'Visu E2E' },
  });

  const loginRes = await request.post('/api/auth/login', { data: { Email: email, Senha: 'Visu@123' } });
  const { token } = await loginRes.json();
  const visuAuth = { Authorization: `Bearer ${token}` };

  const lab = await ensureLab(request, auth);
  const res = await request.post('/api/residuos', {
    headers: visuAuth,
    data: {
      Descricao: 'tentativa visu', LaboratorioId: lab.id, Tipo: 'x',
      Volume: 1, Unidade: 'L', Composicao: 'x', Risco: 'baixo', ClassesReatividade: [],
    },
  });
  expect(res.status()).toBe(403);

  // Mas pode ler
  const lista = await request.get('/api/residuos', { headers: visuAuth });
  expect(lista.ok()).toBeTruthy();
});

test('login com senha errada retorna 401', async ({ request }) => {
  // E-mail inexistente em vez de admin@resqui.local: com o lockout ativo, errar a senha da conta
  // de admin gastaria tentativas da conta que o resto da suíte usa para tudo.
  const res = await request.post('/api/auth/login', {
    data: { Email: `fantasma_${Date.now()}@resqui.local`, Senha: 'errada' },
  });
  expect(res.status()).toBe(401);
});

test('alterar senha com senha atual errada retorna 400', async ({ request }) => {
  const auth = await apiAuth(request);
  const res = await request.post('/api/auth/alterar-senha', {
    headers: auth,
    data: { SenhaAtual: 'naoeessa', NovaSenha: 'OutraSenha@1' },
  });
  expect(res.status()).toBe(400);
});

test('setup 2FA exige a senha e devolve secret e URI otpauth', async ({ request }) => {
  const auth = await apiAuth(request);

  const semSenha = await request.post('/api/auth/2fa/setup', { headers: auth, data: {} });
  expect(semSenha.status()).toBe(400);

  const res = await request.post('/api/auth/2fa/setup', {
    headers: auth,
    data: { Senha: ADMIN.senha },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.secret?.length).toBeGreaterThan(10);
  expect(body.otpauthUri).toContain('otpauth://totp/ResQui');
});

test('sessões lista a sessão atual e revogar-outras não derruba ela', async ({ request }) => {
  // Usuário dedicado: revogar-outras derruba sessões do mesmo usuário, então não pode
  // ser o admin compartilhado pelos demais testes paralelos.
  const adminAuth = await apiAuth(request);
  const email = `sess_${Date.now()}@resqui.local`;
  await request.post('/api/auth/register', {
    headers: adminAuth,
    data: { Email: email, Senha: 'Sess@123', Papel: 'Tecnico', Nome: 'Sessao E2E' },
  });
  const { token } = await (await request.post('/api/auth/login', { data: { Email: email, Senha: 'Sess@123' } })).json();
  const auth = { Authorization: `Bearer ${token}` };

  const sessoes = await (await request.get('/api/auth/sessoes', { headers: auth })).json();
  expect(Array.isArray(sessoes)).toBeTruthy();
  expect(sessoes.some((s) => s.atual)).toBeTruthy();

  await request.post('/api/auth/sessoes/revogar-outras', { headers: auth });
  // a sessão atual ainda funciona
  const ok = await request.get('/api/auth/me', { headers: auth });
  expect(ok.ok()).toBeTruthy();
});

// RF06 / atores do artigo: Pesquisador solicita descarte + baixa, mas não cria MTR.
test('Pesquisador cria resíduo mas é bloqueado em MTR', async ({ request }) => {
  const auth = await apiAuth(request);
  const email = `pesq_${Date.now()}@resqui.local`;
  await request.post('/api/auth/register', {
    headers: auth,
    data: { Email: email, Senha: 'Pesq@123', Papel: 'Pesquisador', Nome: 'Pesq E2E' },
  });
  const login = await request.post('/api/auth/login', { data: { Email: email, Senha: 'Pesq@123' } });
  const { token } = await login.json();
  const pesqAuth = { Authorization: `Bearer ${token}` };

  const lab = await ensureLab(request, auth);
  const criar = await request.post('/api/residuos', {
    headers: pesqAuth,
    data: {
      Descricao: 'descarte pesquisador', LaboratorioId: lab.id, Tipo: 'x',
      Volume: 1, Unidade: 'L', Composicao: 'x', Risco: 'baixo', ClassesReatividade: [],
    },
  });
  expect(criar.ok()).toBeTruthy();

  const mtr = await request.post('/api/mtrs', {
    headers: pesqAuth,
    data: { Gerador: 'g', Transportadora: 't', ResiduoIds: [1] },
  });
  expect(mtr.status()).toBe(403);
});

// Professor aprova solicitação de descarte (RF06).
test('Professor aprova descarte solicitado', async ({ request }) => {
  const auth = await apiAuth(request);
  const email = `prof_${Date.now()}@resqui.local`;
  await request.post('/api/auth/register', {
    headers: auth,
    data: { Email: email, Senha: 'Prof@123', Papel: 'Professor', Nome: 'Prof E2E' },
  });
  const login = await request.post('/api/auth/login', { data: { Email: email, Senha: 'Prof@123' } });
  const { token } = await login.json();
  const profAuth = { Authorization: `Bearer ${token}` };

  // admin cria o resíduo (nasce "solicitado")
  const lab = await ensureLab(request, auth);
  const criar = await request.post('/api/residuos', {
    headers: auth,
    data: {
      Descricao: 'descarte p/ professor', LaboratorioId: lab.id, Tipo: 'x',
      Volume: 1, Unidade: 'L', Composicao: 'x', Risco: 'baixo', ClassesReatividade: [],
    },
  });
  const residuo = await criar.json();

  const aprovar = await request.put(`/api/residuos/${residuo.id}/aprovar`, { headers: profAuth });
  expect(aprovar.ok()).toBeTruthy();
  const atualizado = await aprovar.json();
  expect(atualizado.status).toBe('aguardando-coleta');
});

// Pesquisador não está na policy Aprovador (Admin/Gestor/Professor) — aprovar deve ser 403.
test('Pesquisador é bloqueado ao aprovar descarte', async ({ request }) => {
  const auth = await apiAuth(request);
  const email = `pesq2_${Date.now()}@resqui.local`;
  await request.post('/api/auth/register', {
    headers: auth,
    data: { Email: email, Senha: 'Pesq@123', Papel: 'Pesquisador', Nome: 'Pesq2 E2E' },
  });
  const login = await request.post('/api/auth/login', { data: { Email: email, Senha: 'Pesq@123' } });
  const { token } = await login.json();
  const pesqAuth = { Authorization: `Bearer ${token}` };

  // admin cria o resíduo (nasce "solicitado")
  const lab = await ensureLab(request, auth);
  const criar = await request.post('/api/residuos', {
    headers: auth,
    data: {
      Descricao: 'descarte p/ bloqueio pesquisador', LaboratorioId: lab.id, Tipo: 'x',
      Volume: 1, Unidade: 'L', Composicao: 'x', Risco: 'baixo', ClassesReatividade: [],
    },
  });
  const residuo = await criar.json();

  const aprovar = await request.put(`/api/residuos/${residuo.id}/aprovar`, { headers: pesqAuth });
  expect(aprovar.status()).toBe(403);
});

// Professor não está na policy Tecnico (Admin/Gestor/Tecnico) — criar MTR deve ser 403.
test('Professor é bloqueado ao criar MTR', async ({ request }) => {
  const auth = await apiAuth(request);
  const email = `prof2_${Date.now()}@resqui.local`;
  await request.post('/api/auth/register', {
    headers: auth,
    data: { Email: email, Senha: 'Prof@123', Papel: 'Professor', Nome: 'Prof2 E2E' },
  });
  const login = await request.post('/api/auth/login', { data: { Email: email, Senha: 'Prof@123' } });
  const { token } = await login.json();
  const profAuth = { Authorization: `Bearer ${token}` };

  const mtr = await request.post('/api/mtrs', {
    headers: profAuth,
    data: { Gerador: 'g', Transportadora: 't', ResiduoIds: [1] },
  });
  expect(mtr.status()).toBe(403);
});

// Hard-delete de usuário JÁ ARQUIVADO deve removê-lo de fato (erasure LGPD).
// Ancora o fix do bug em que ExcluirAsync gateava por FindByIdAsync (filtra Arquivado)
// e fazia no-op silencioso (204 falso-sucesso) ao excluir um arquivado.
test('hard-delete remove usuário arquivado e some da listagem', async ({ request }) => {
  const auth = await apiAuth(request);
  const email = `del_${Date.now()}@resqui.local`;
  await request.post('/api/auth/register', {
    headers: auth,
    data: { Email: email, Senha: 'Del@1234', Papel: 'Tecnico', Nome: 'Del E2E' },
  });

  const achar = async () =>
    (await (await request.get('/api/usuarios', { headers: auth })).json())
      .find((u) => u.email === email);

  const criado = await achar();
  expect(criado).toBeTruthy();

  // Arquiva (soft-delete): continua na listagem, marcado como arquivado.
  const arq = await request.delete(`/api/usuarios/${criado.id}`, { headers: auth });
  expect(arq.status()).toBe(204);
  const arquivado = await achar();
  expect(arquivado?.arquivado).toBe(true);

  // Hard-delete do usuário arquivado — o caso que antes falhava em silêncio.
  const del = await request.delete(`/api/usuarios/${criado.id}/definitivo`, { headers: auth });
  expect(del.status()).toBe(204);

  // Agora some de vez da listagem.
  expect(await achar()).toBeFalsy();
});

// Ativa 2FA num usuário dedicado (não o admin — quebraria os outros specs), entra com um
// código de recuperação e confere que a contagem de códigos restantes cai.
test('códigos de recuperação: ativa 2FA, entra com um código e a contagem cai', async ({ request }) => {
  const auth = await apiAuth(request);
  const email = `rec_${Date.now()}@resqui.local`;
  const senha = 'Recup@123';
  await request.post('/api/auth/register', {
    headers: auth,
    data: { Email: email, Senha: senha, Papel: 'Tecnico', Nome: 'Recuperação E2E' },
  });

  const login1 = await request.post('/api/auth/login', { data: { Email: email, Senha: senha } });
  const meuAuth = { Authorization: `Bearer ${(await login1.json()).token}` };

  const setup = await (await request.post('/api/auth/2fa/setup', {
    headers: meuAuth,
    data: { Senha: senha },
  })).json();
  const ativar = await request.post('/api/auth/2fa/ativar', {
    headers: meuAuth,
    data: { Codigo: totp(setup.secret) },
  });
  expect(ativar.ok()).toBeTruthy();
  const { codigos } = await ativar.json();
  expect(codigos).toHaveLength(10);

  // Login sem segundo fator agora exige o código
  const parcial = await request.post('/api/auth/login', { data: { Email: email, Senha: senha } });
  expect((await parcial.json()).requires2fa).toBe(true);

  // Entra com um código de recuperação
  const login2 = await request.post('/api/auth/login', {
    data: { Email: email, Senha: senha, Codigo2fa: codigos[0] },
  });
  expect(login2.ok()).toBeTruthy();
  const novoAuth = { Authorization: `Bearer ${(await login2.json()).token}` };

  const me = await (await request.get('/api/auth/me', { headers: novoAuth })).json();
  expect(me.codigosRecuperacaoRestantes).toBe(9);

  // O mesmo código não serve de novo
  const repetido = await request.post('/api/auth/login', {
    data: { Email: email, Senha: senha, Codigo2fa: codigos[0] },
  });
  expect(repetido.status()).toBe(401);
});

test('Admin reseta o 2FA: derruba a sessão antiga e a própria rotação (não um setup subsequente) invalida o segredo antigo', async ({ request }) => {
  const adminAuth = await apiAuth(request);
  const email = `reset_${Date.now()}@resqui.local`;
  const senha = 'Reset@123';
  const criado = await request.post('/api/auth/register', {
    headers: adminAuth,
    data: { Email: email, Senha: senha, Papel: 'Tecnico', Nome: 'Reset E2E' },
  });
  const { id } = await criado.json();

  const login1 = await request.post('/api/auth/login', { data: { Email: email, Senha: senha } });
  const meuAuth = { Authorization: `Bearer ${(await login1.json()).token}` };

  const setup1 = await (await request.post('/api/auth/2fa/setup', {
    headers: meuAuth, data: { Senha: senha },
  })).json();
  await request.post('/api/auth/2fa/ativar', {
    headers: meuAuth, data: { Codigo: totp(setup1.secret) },
  });

  // Com 2FA ativo, o login exige segundo fator
  const parcial = await request.post('/api/auth/login', { data: { Email: email, Senha: senha } });
  expect((await parcial.json()).requires2fa).toBe(true);

  const reset = await request.post(`/api/usuarios/${id}/2fa/reset`, { headers: adminAuth });
  expect(reset.status()).toBe(204);

  // A sessão emitida antes do reset é derrubada — o invasor não continua logado.
  const meComSessaoAntiga = await request.get('/api/auth/me', { headers: meuAuth });
  expect(meComSessaoAntiga.status()).toBe(401);

  // Login volta a devolver token direto (2FA desligado)
  const login2 = await request.post('/api/auth/login', { data: { Email: email, Senha: senha } });
  expect(login2.ok()).toBeTruthy();
  const depois = await login2.json();
  expect(depois.requires2fa).toBeFalsy();
  expect(depois.token).toBeTruthy();
  const novoAuth = { Authorization: `Bearer ${depois.token}` };

  // Discriminante: SEM chamar /2fa/setup de novo (que também rotaciona a chave — comparar
  // dois secrets de dois setups seria vácuo quanto ao reset), tenta reativar o 2FA com o
  // código do segredo pré-reset. /2fa/ativar nunca rotaciona chave — só valida o código
  // contra a chave atual. Se ResetarSegundoFatorAsync não tivesse chamado
  // ResetAuthenticatorKeyAsync, a chave ainda seria a de setup1 e esta ativação teria
  // sucesso; a recusa abaixo só se explica pela rotação feita PELO reset.
  const ativarComSegredoAntigo = await request.post('/api/auth/2fa/ativar', {
    headers: novoAuth, data: { Codigo: totp(setup1.secret) },
  });
  expect(ativarComSegredoAntigo.status()).toBe(400);

  // Fluxo normal: setup novo + ativação com o segredo atual funciona.
  const setup2 = await (await request.post('/api/auth/2fa/setup', {
    headers: novoAuth, data: { Senha: senha },
  })).json();
  const ativar2 = await request.post('/api/auth/2fa/ativar', {
    headers: novoAuth, data: { Codigo: totp(setup2.secret) },
  });
  expect(ativar2.ok()).toBeTruthy();

  // O próprio Admin não pode se resetar
  const me = await (await request.get('/api/auth/me', { headers: adminAuth })).json();
  const auto = await request.post(`/api/usuarios/${me.id}/2fa/reset`, { headers: adminAuth });
  expect(auto.status()).toBe(400);
});

test('conta bloqueia após 5 senhas erradas e recusa até a senha correta', async ({ request }) => {
  const auth = await apiAuth(request);
  const email = `lock_${Date.now()}@resqui.local`;
  const senha = 'Lock@123';
  await request.post('/api/auth/register', {
    headers: auth,
    data: { Email: email, Senha: senha, Papel: 'Visualizador', Nome: 'Lockout E2E' },
  });

  // As cinco primeiras falhas ainda respondem 401: a checagem de bloqueio roda antes da senha,
  // então a tentativa que estoura o contador só é recusada como bloqueio na seguinte.
  for (let i = 0; i < 5; i++) {
    const r = await request.post('/api/auth/login', { data: { Email: email, Senha: 'errada' } });
    expect(r.status()).toBe(401);
  }

  const bloqueado = await request.post('/api/auth/login', { data: { Email: email, Senha: 'errada' } });
  expect(bloqueado.status()).toBe(400);
  expect((await bloqueado.json()).message).toContain('bloqueada');

  // A senha CORRETA também é recusada — prova que é bloqueio, não credencial inválida.
  const comSenhaCerta = await request.post('/api/auth/login', { data: { Email: email, Senha: senha } });
  expect(comSenhaCerta.status()).toBe(400);

  // A conta de admin, usada pelo resto da suíte, continua utilizável.
  const admin = await request.post('/api/auth/login', { data: ADMIN });
  expect(admin.ok()).toBeTruthy();
});

test('política de senha: rejeita fraca com 400 e aceita a que atende', async ({ request }) => {
  const auth = await apiAuth(request);
  const base = `pol_${Date.now()}`;

  // 7 caracteres, mas com as quatro classes — barrada só pelo comprimento.
  const curta = await request.post('/api/auth/register', {
    headers: auth,
    data: { Email: `${base}a@resqui.local`, Senha: 'Ab@1234', Papel: 'Visualizador', Nome: 'Pol A' },
  });
  // 400, não 500: o CreateAsync passou a lançar ValidationException.
  expect(curta.status()).toBe(400);
  expect((await curta.json()).message).toBeTruthy();

  // 8 caracteres, sem caractere não-alfanumérico.
  const semEspecial = await request.post('/api/auth/register', {
    headers: auth,
    data: { Email: `${base}b@resqui.local`, Senha: 'Abcd1234', Papel: 'Visualizador', Nome: 'Pol B' },
  });
  expect(semEspecial.status()).toBe(400);

  // 8 caracteres com dígito, minúscula, maiúscula e especial.
  const ok = await request.post('/api/auth/register', {
    headers: auth,
    data: { Email: `${base}c@resqui.local`, Senha: 'Abcd@123', Papel: 'Visualizador', Nome: 'Pol C' },
  });
  expect(ok.ok()).toBeTruthy();
});

test('hard-delete do usuário derruba o token dele na hora', async ({ request }) => {
  const auth = await apiAuth(request);
  const email = `tok_${Date.now()}@resqui.local`;
  const senha = 'Token@123';
  await request.post('/api/auth/register', {
    headers: auth,
    data: { Email: email, Senha: senha, Papel: 'Tecnico', Nome: 'Token E2E' },
  });

  const { token } = await (await request.post('/api/auth/login', { data: { Email: email, Senha: senha } })).json();
  const userAuth = { Authorization: `Bearer ${token}` };
  expect((await request.get('/api/auth/me', { headers: userAuth })).ok()).toBeTruthy();

  const alvo = (await (await request.get('/api/usuarios', { headers: auth })).json())
    .find((u) => u.email === email);
  await request.delete(`/api/usuarios/${alvo.id}`, { headers: auth });             // arquiva primeiro
  const del = await request.delete(`/api/usuarios/${alvo.id}/definitivo`, { headers: auth });
  expect(del.status()).toBe(204);

  // O cascade apagou a SessaoToken; sem linha, o gate rejeita o token que antes seguia válido.
  const depois = await request.get('/api/auth/me', { headers: userAuth });
  expect(depois.status()).toBe(401);
});

test('pgrs-config exige Tecnico: Visualizador 403, Tecnico 200', async ({ request }) => {
  const auth = await apiAuth(request);
  const stamp = Date.now();

  const visu = `pgvisu_${stamp}@resqui.local`;
  await request.post('/api/auth/register', {
    headers: auth,
    data: { Email: visu, Senha: 'Visu@123', Papel: 'Visualizador', Nome: 'PG Visu' },
  });
  const { token: tokenVisu } = await (await request.post('/api/auth/login', {
    data: { Email: visu, Senha: 'Visu@123' },
  })).json();
  const bloqueado = await request.get('/api/pgrs-config', {
    headers: { Authorization: `Bearer ${tokenVisu}` },
  });
  expect(bloqueado.status()).toBe(403);

  const tec = `pgtec_${stamp}@resqui.local`;
  await request.post('/api/auth/register', {
    headers: auth,
    data: { Email: tec, Senha: 'Tecn@123', Papel: 'Tecnico', Nome: 'PG Tec' },
  });
  const { token: tokenTec } = await (await request.post('/api/auth/login', {
    data: { Email: tec, Senha: 'Tecn@123' },
  })).json();
  const permitido = await request.get('/api/pgrs-config', {
    headers: { Authorization: `Bearer ${tokenTec}` },
  });
  expect(permitido.ok()).toBeTruthy();
});
