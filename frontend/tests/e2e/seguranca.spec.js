import { test, expect } from '@playwright/test';
import { ADMIN, apiAuth, ensureLab, totp, criarResiduoAguardandoColeta, seedPgrsConfig, todosLaboratorios } from './seed';

// Aluno solicita descarte, mas não edita resíduo nem opera manifesto (item: autorização fina).
test('Aluno cria resíduo mas é bloqueado ao editá-lo', async ({ request }) => {
  const auth = await apiAuth(request); // admin cria o usuário
  const email = `aluno_${Date.now()}@resqui.local`;
  await request.post('/api/auth/register', {
    headers: auth,
    data: { Email: email, Senha: 'Alun@123', Papel: 'Aluno', Nome: 'Aluno E2E', LaboratorioIds: await todosLaboratorios(request, auth) },
  });

  const loginRes = await request.post('/api/auth/login', { data: { Email: email, Senha: 'Alun@123' } });
  const { token } = await loginRes.json();
  const alunoAuth = { Authorization: `Bearer ${token}` };

  const lab = await ensureLab(request, auth);
  const res = await request.post('/api/residuos', {
    headers: alunoAuth,
    data: {
      Descricao: 'solicitação do aluno', LaboratorioId: lab.id, Tipo: 'x',
      Volume: 1, Unidade: 'L', Composicao: 'x', Risco: 'baixo', ClassesReatividade: [5],
    },
  });
  expect(res.ok()).toBeTruthy(); // POST /api/residuos exige Operacional, que o Aluno tem
  const residuo = await res.json();

  // PUT exige Operacao, que ele não tem
  const edicao = await request.put(`/api/residuos/${residuo.id}`, {
    headers: alunoAuth,
    data: { Descricao: 'tentativa de edição' },
  });
  expect(edicao.status()).toBe(403);

  const lista = await request.get('/api/residuos', { headers: alunoAuth });
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
    data: { Email: email, Senha: 'Sess@123', Papel: 'Professor', Nome: 'Sessao E2E', LaboratorioIds: await todosLaboratorios(request, adminAuth) },
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

// RF06 / atores do artigo: o Aluno solicita descarte + baixa, mas não cria MTR.
test('Aluno cria resíduo mas é bloqueado em MTR', async ({ request }) => {
  const auth = await apiAuth(request);
  const email = `pesq_${Date.now()}@resqui.local`;
  await request.post('/api/auth/register', {
    headers: auth,
    data: { Email: email, Senha: 'Pesq@123', Papel: 'Aluno', Nome: 'Pesq E2E', LaboratorioIds: await todosLaboratorios(request, auth) },
  });
  const login = await request.post('/api/auth/login', { data: { Email: email, Senha: 'Pesq@123' } });
  const { token } = await login.json();
  const pesqAuth = { Authorization: `Bearer ${token}` };

  const lab = await ensureLab(request, auth);
  const criar = await request.post('/api/residuos', {
    headers: pesqAuth,
    data: {
      Descricao: 'descarte do aluno', LaboratorioId: lab.id, Tipo: 'x',
      Volume: 1, Unidade: 'L', Composicao: 'x', Risco: 'baixo', ClassesReatividade: [5],
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
    data: { Email: email, Senha: 'Prof@123', Papel: 'Professor', Nome: 'Prof E2E', LaboratorioIds: await todosLaboratorios(request, auth) },
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
      Volume: 1, Unidade: 'L', Composicao: 'x', Risco: 'baixo', ClassesReatividade: [5],
    },
  });
  const residuo = await criar.json();

  const aprovar = await request.put(`/api/residuos/${residuo.id}/aprovar`, { headers: profAuth });
  expect(aprovar.ok()).toBeTruthy();
  const atualizado = await aprovar.json();
  expect(atualizado.status).toBe('aguardando-coleta');
});

// O Aluno não está na policy Aprovador — aprovar deve ser 403.
test('Aluno é bloqueado ao aprovar descarte', async ({ request }) => {
  const auth = await apiAuth(request);
  const email = `pesq2_${Date.now()}@resqui.local`;
  await request.post('/api/auth/register', {
    headers: auth,
    data: { Email: email, Senha: 'Pesq@123', Papel: 'Aluno', Nome: 'Pesq2 E2E', LaboratorioIds: await todosLaboratorios(request, auth) },
  });
  const login = await request.post('/api/auth/login', { data: { Email: email, Senha: 'Pesq@123' } });
  const { token } = await login.json();
  const pesqAuth = { Authorization: `Bearer ${token}` };

  // admin cria o resíduo (nasce "solicitado")
  const lab = await ensureLab(request, auth);
  const criar = await request.post('/api/residuos', {
    headers: auth,
    data: {
      Descricao: 'descarte p/ bloqueio aluno', LaboratorioId: lab.id, Tipo: 'x',
      Volume: 1, Unidade: 'L', Composicao: 'x', Risco: 'baixo', ClassesReatividade: [5],
    },
  });
  const residuo = await criar.json();

  const aprovar = await request.put(`/api/residuos/${residuo.id}/aprovar`, { headers: pesqAuth });
  expect(aprovar.status()).toBe(403);
});

test('Aluno cadastra reagente mas é bloqueado ao editá-lo', async ({ request }) => {
  const auth = await apiAuth(request);
  const email = `aluno_reagente_${Date.now()}@resqui.local`;
  await request.post('/api/auth/register', {
    headers: auth,
    data: { Email: email, Senha: 'Alun@123', Papel: 'Aluno', Nome: 'Aluno Reagente E2E', LaboratorioIds: await todosLaboratorios(request, auth) },
  });
  const login = await request.post('/api/auth/login', { data: { Email: email, Senha: 'Alun@123' } });
  const { token } = await login.json();
  const alunoAuth = { Authorization: `Bearer ${token}` };

  const lab = await ensureLab(request, auth);
  const reagente = {
    Nome: `Reagente do aluno ${Date.now()}`, Cas: '64-17-5', Formula: 'C2H6O', ClasseReatividade: 5,
    Estoque: 1, Unidade: 'L', Controlado: false, LaboratorioId: lab.id, Armario: lab.armarios?.[0] ?? '',
  };
  const criacao = await request.post('/api/reagentes', { headers: alunoAuth, data: reagente });
  expect(criacao.status()).toBe(201);
  const criado = await criacao.json();

  const edicao = await request.put(`/api/reagentes/${criado.id}`, {
    headers: alunoAuth,
    data: { Nome: 'tentativa de edição', Estoque: 1, LaboratorioId: lab.id, Armario: reagente.Armario },
  });
  expect(edicao.status()).toBe(403);
});

// O Aluno não está na policy Operacao — criar MTR deve ser 403.
test('Aluno é bloqueado ao criar MTR', async ({ request }) => {
  const auth = await apiAuth(request);
  const email = `aluno_mtr_${Date.now()}@resqui.local`;
  await request.post('/api/auth/register', {
    headers: auth,
    data: { Email: email, Senha: 'Alun@123', Papel: 'Aluno', Nome: 'Aluno MTR E2E', LaboratorioIds: await todosLaboratorios(request, auth) },
  });
  const login = await request.post('/api/auth/login', { data: { Email: email, Senha: 'Alun@123' } });
  const { token } = await login.json();
  const alunoAuth = { Authorization: `Bearer ${token}` };

  const mtr = await request.post('/api/mtrs', {
    headers: alunoAuth,
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
    data: { Email: email, Senha: 'Del@1234', Papel: 'Professor', Nome: 'Del E2E', LaboratorioIds: await todosLaboratorios(request, auth) },
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
    data: { Email: email, Senha: senha, Papel: 'Professor', Nome: 'Recuperação E2E', LaboratorioIds: await todosLaboratorios(request, auth) },
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

test('Professor reseta o 2FA: derruba a sessão antiga e a própria rotação (não um setup subsequente) invalida o segredo antigo', async ({ request }) => {
  const adminAuth = await apiAuth(request);
  const email = `reset_${Date.now()}@resqui.local`;
  const senha = 'Reset@123';
  const criado = await request.post('/api/auth/register', {
    headers: adminAuth,
    data: { Email: email, Senha: senha, Papel: 'Professor', Nome: 'Reset E2E', LaboratorioIds: await todosLaboratorios(request, adminAuth) },
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
    data: { Email: email, Senha: senha, Papel: 'Aluno', Nome: 'Lockout E2E', LaboratorioIds: await todosLaboratorios(request, auth) },
  });

  // As cinco primeiras falhas ainda respondem 401: a checagem de bloqueio roda antes da senha,
  // então a tentativa que estoura o contador só é recusada como bloqueio na seguinte.
  for (let i = 0; i < 5; i++) {
    const r = await request.post('/api/auth/login', { data: { Email: email, Senha: 'errada' } });
    expect(r.status()).toBe(401);
  }

  const bloqueado = await request.post('/api/auth/login', { data: { Email: email, Senha: 'errada' } });
  expect(bloqueado.status()).toBe(429);
  expect(Number(bloqueado.headers()['retry-after'])).toBeGreaterThan(0);
  expect((await bloqueado.json()).message).toContain('bloqueada');

  // A senha CORRETA também é recusada — prova que é bloqueio, não credencial inválida.
  const comSenhaCerta = await request.post('/api/auth/login', { data: { Email: email, Senha: senha } });
  expect(comSenhaCerta.status()).toBe(429);

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
    data: { Email: `${base}a@resqui.local`, Senha: 'Ab@1234', Papel: 'Aluno', Nome: 'Pol A' },
  });
  // 400, não 500: o CreateAsync passou a lançar ValidationException.
  expect(curta.status()).toBe(400);
  expect((await curta.json()).message).toBeTruthy();

  // 8 caracteres, sem caractere não-alfanumérico.
  const semEspecial = await request.post('/api/auth/register', {
    headers: auth,
    data: { Email: `${base}b@resqui.local`, Senha: 'Abcd1234', Papel: 'Aluno', Nome: 'Pol B' },
  });
  expect(semEspecial.status()).toBe(400);

  // 8 caracteres com dígito, minúscula, maiúscula e especial.
  const ok = await request.post('/api/auth/register', {
    headers: auth,
    data: { Email: `${base}c@resqui.local`, Senha: 'Abcd@123', Papel: 'Aluno', Nome: 'Pol C' },
  });
  expect(ok.ok()).toBeTruthy();
});

test('hard-delete do usuário derruba o token dele na hora', async ({ request }) => {
  const auth = await apiAuth(request);
  const email = `tok_${Date.now()}@resqui.local`;
  const senha = 'Token@123';
  await request.post('/api/auth/register', {
    headers: auth,
    data: { Email: email, Senha: senha, Papel: 'Professor', Nome: 'Token E2E', LaboratorioIds: await todosLaboratorios(request, auth) },
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

test('pgrs-config exige Operacao: Aluno 403, Professor 200', async ({ request }) => {
  const auth = await apiAuth(request);
  const stamp = Date.now();

  const visu = `pgvisu_${stamp}@resqui.local`;
  await request.post('/api/auth/register', {
    headers: auth,
    data: { Email: visu, Senha: 'Visu@123', Papel: 'Aluno', Nome: 'PG Visu', LaboratorioIds: await todosLaboratorios(request, auth) },
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
    data: { Email: tec, Senha: 'Tecn@123', Papel: 'Professor', Nome: 'PG Tec', LaboratorioIds: await todosLaboratorios(request, auth) },
  });
  const { token: tokenTec } = await (await request.post('/api/auth/login', {
    data: { Email: tec, Senha: 'Tecn@123' },
  })).json();
  const permitido = await request.get('/api/pgrs-config', {
    headers: { Authorization: `Bearer ${tokenTec}` },
  });
  expect(permitido.ok()).toBeTruthy();
});

test('configuração global só o Admin escreve: Professor recebe 403 no PGRS e nas regras da matriz', async ({ request }) => {
  const auth = await apiAuth(request);
  const email = `cfgprof_${Date.now()}@resqui.local`;
  await request.post('/api/auth/register', {
    headers: auth,
    data: { Email: email, Senha: 'Prof@1234', Papel: 'Professor', Nome: 'Cfg Prof', LaboratorioIds: await todosLaboratorios(request, auth) },
  });
  const { token } = await (await request.post('/api/auth/login', {
    data: { Email: email, Senha: 'Prof@1234' },
  })).json();
  const headers = { Authorization: `Bearer ${token}` };

  const atual = await (await request.get('/api/pgrs-config', { headers })).json();
  const pgrs = await request.put('/api/pgrs-config', {
    headers,
    data: { ...atual, AtualizadoEmEsperado: atual.atualizadoEm },
  });
  expect(pgrs.status()).toBe(403);

  const salvar = await request.put('/api/compat/overrides/1/2', {
    headers,
    data: { Nivel: 0, Motivo: 'teste de permissão', Autor: 'Cfg Prof' },
  });
  expect(salvar.status()).toBe(403);
  expect((await request.delete('/api/compat/overrides/1/2', { headers })).status()).toBe(403);

  expect((await request.get('/api/compat/overrides', { headers })).ok()).toBeTruthy();
});

// O recorte de identificação existe para o resumo de segurança, aberto por qualquer papel: ele
// libera razão social e unidade sem afrouxar o GET completo (CNPJ, endereço, contatos do RT).
test('pgrs-config/identificacao é aberto a Aluno e não vaza os campos restritos', async ({ request }) => {
  const auth = await apiAuth(request);
  const stamp = Date.now();

  await seedPgrsConfig(request, auth, {
    RazaoSocial: 'Instituição E2E', Unidade: 'Campus E2E',
    Cnpj: '00000000000100', Endereco: 'Rua E2E, 1',
    RespTecnico: 'RT E2E', RespEmail: 'rt@e2e.local', RespTel: '35 90000-0000',
  });

  const visu = `idvisu_${stamp}@resqui.local`;
  await request.post('/api/auth/register', {
    headers: auth,
    data: { Email: visu, Senha: 'Visu@123', Papel: 'Aluno', Nome: 'Id Visu', LaboratorioIds: await todosLaboratorios(request, auth) },
  });
  const { token } = await (await request.post('/api/auth/login', {
    data: { Email: visu, Senha: 'Visu@123' },
  })).json();
  const headers = { Authorization: `Bearer ${token}` };

  const res = await request.get('/api/pgrs-config/identificacao', { headers });
  expect(res.ok()).toBeTruthy();
  const corpo = await res.json();
  expect(corpo.razaoSocial).toBe('Instituição E2E');
  expect(corpo.unidade).toBe('Campus E2E');
  expect(Object.keys(corpo).sort()).toEqual(['razaoSocial', 'unidade']);

  // O mesmo token continua barrado no endpoint completo.
  expect((await request.get('/api/pgrs-config', { headers })).status()).toBe(403);
});

// Confirmar destinação exige a policy Operacao — o Aluno deve levar 403.
test('Aluno não confirma destinação de MTR', async ({ request }) => {
  const auth = await apiAuth(request);
  const email = `pesq3_${Date.now()}@resqui.local`;
  await request.post('/api/auth/register', {
    headers: auth,
    data: { Email: email, Senha: 'Pesq@123', Papel: 'Aluno', Nome: 'Pesq3 E2E', LaboratorioIds: await todosLaboratorios(request, auth) },
  });
  const loginRes = await request.post('/api/auth/login', { data: { Email: email, Senha: 'Pesq@123' } });
  const { token } = await loginRes.json();

  const residuo = await criarResiduoAguardandoColeta(request, auth);
  const mtrRes = await request.post('/api/mtrs', {
    headers: auth,
    data: { Gerador: 'Unifei', Transportadora: 'EcoLog', Destinador: 'EcoQ', CodigoIbama: 'A099', ResiduoIds: [residuo.id] },
  });
  const mtr = await mtrRes.json();

  const res = await request.post(`/api/mtrs/${mtr.id}/destinacao`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { Data: new Date().toISOString().slice(0, 10) },
  });
  expect(res.status()).toBe(403);
});

// Confirmar exige a policy Operacao e reabrir exige Cadastro — o Professor tem as duas.
test('Professor confirma e reabre a destinação do manifesto', async ({ request }) => {
  const auth = await apiAuth(request);
  const email = `tec_dest_${Date.now()}@resqui.local`;
  await request.post('/api/auth/register', {
    headers: auth,
    data: { Email: email, Senha: 'Tecn@123', Papel: 'Professor', Nome: 'Tec Dest E2E', LaboratorioIds: await todosLaboratorios(request, auth) },
  });
  const loginRes = await request.post('/api/auth/login', { data: { Email: email, Senha: 'Tecn@123' } });
  const { token } = await loginRes.json();
  const tecAuth = { Authorization: `Bearer ${token}` };

  const residuo = await criarResiduoAguardandoColeta(request, auth);
  const mtrRes = await request.post('/api/mtrs', {
    headers: auth,
    data: { Gerador: 'Unifei', Transportadora: 'EcoLog', Destinador: 'EcoQ', CodigoIbama: 'A099', ResiduoIds: [residuo.id] },
  });
  const mtr = await mtrRes.json();

  const confirmar = await request.post(`/api/mtrs/${mtr.id}/destinacao`, {
    headers: tecAuth,
    data: { Data: new Date().toISOString().slice(0, 10) },
  });
  expect(confirmar.ok()).toBeTruthy();

  const reabrir = await request.delete(`/api/mtrs/${mtr.id}/destinacao`, { headers: tecAuth });
  expect(reabrir.status()).toBe(204);

  // O segundo DELETE recusa, porque já não está destinado.
  const denovo = await request.delete(`/api/mtrs/${mtr.id}/destinacao`, { headers: auth });
  expect(denovo.status()).toBe(400);
});

// O Admin gerencia as contas de professor; o Professor cuida dos próprios alunos. O gate olha o
// papel do ALVO, não só o de quem pede — por isso não é uma policy sozinha.
test('Professor cria Aluno mas não cria outro Professor', async ({ request }) => {
  const auth = await apiAuth(request);
  const email = `prof_gate_${Date.now()}@resqui.local`;
  const laboratorioIds = await todosLaboratorios(request, auth);
  await request.post('/api/auth/register', {
    headers: auth,
    data: { Email: email, Senha: 'Prof@123', Papel: 'Professor', Nome: 'Prof Gate E2E', LaboratorioIds: laboratorioIds },
  });
  const login = await request.post('/api/auth/login', { data: { Email: email, Senha: 'Prof@123' } });
  const { token } = await login.json();
  const profAuth = { Authorization: `Bearer ${token}` };

  const aluno = await request.post('/api/auth/register', {
    headers: profAuth,
    data: { Email: `aluno_gate_${Date.now()}@resqui.local`, Senha: 'Alun@123', Papel: 'Aluno', Nome: 'Aluno Gate', LaboratorioIds: laboratorioIds },
  });
  expect(aluno.ok()).toBeTruthy();

  const colega = await request.post('/api/auth/register', {
    headers: profAuth,
    data: { Email: `colega_gate_${Date.now()}@resqui.local`, Senha: 'Prof@123', Papel: 'Professor', Nome: 'Colega' },
  });
  expect(colega.status()).toBe(400);
  expect((await colega.json()).message).toMatch(/só o Admin/);

  const novoAdmin = await request.post('/api/auth/register', {
    headers: profAuth,
    data: { Email: `admin_gate_${Date.now()}@resqui.local`, Senha: 'Adm@1234', Papel: 'Admin', Nome: 'Admin' },
  });
  expect(novoAdmin.status()).toBe(400);
});

test('Professor arquiva Aluno mas não arquiva colega Professor', async ({ request }) => {
  const auth = await apiAuth(request);
  const base = Date.now();
  const profEmail = `prof_arq_${base}@resqui.local`;
  const laboratorioIds = await todosLaboratorios(request, auth);
  await request.post('/api/auth/register', {
    headers: auth,
    data: { Email: profEmail, Senha: 'Prof@123', Papel: 'Professor', Nome: 'Prof Arq', LaboratorioIds: laboratorioIds },
  });
  const colegaRes = await request.post('/api/auth/register', {
    headers: auth,
    data: { Email: `colega_arq_${base}@resqui.local`, Senha: 'Prof@123', Papel: 'Professor', Nome: 'Colega Arq', LaboratorioIds: laboratorioIds },
  });
  const colega = await colegaRes.json();

  const login = await request.post('/api/auth/login', { data: { Email: profEmail, Senha: 'Prof@123' } });
  const { token } = await login.json();
  const profAuth = { Authorization: `Bearer ${token}` };

  const alunoRes = await request.post('/api/auth/register', {
    headers: profAuth,
    data: { Email: `aluno_arq_${base}@resqui.local`, Senha: 'Alun@123', Papel: 'Aluno', Nome: 'Aluno Arq', LaboratorioIds: laboratorioIds },
  });
  const aluno = await alunoRes.json();

  const arquivaAluno = await request.delete(`/api/usuarios/${aluno.id}`, { headers: profAuth });
  expect(arquivaAluno.status()).toBe(204);

  const arquivaColega = await request.delete(`/api/usuarios/${colega.id}`, { headers: profAuth });
  expect(arquivaColega.status()).toBe(400);
  expect((await arquivaColega.json()).message).toMatch(/só o Admin/);
});

test('Professor não alcança papel, exclusão definitiva nem reset de 2FA', async ({ request }) => {
  const auth = await apiAuth(request);
  const base = Date.now();
  const profEmail = `prof_adm_${base}@resqui.local`;
  await request.post('/api/auth/register', {
    headers: auth,
    data: { Email: profEmail, Senha: 'Prof@123', Papel: 'Professor', Nome: 'Prof Adm', LaboratorioIds: await todosLaboratorios(request, auth) },
  });
  const alvoRes = await request.post('/api/auth/register', {
    headers: auth,
    data: { Email: `alvo_adm_${base}@resqui.local`, Senha: 'Alun@123', Papel: 'Aluno', Nome: 'Alvo Adm' },
  });
  const alvo = await alvoRes.json();

  const login = await request.post('/api/auth/login', { data: { Email: profEmail, Senha: 'Prof@123' } });
  const { token } = await login.json();
  const profAuth = { Authorization: `Bearer ${token}` };

  const papel = await request.put(`/api/usuarios/${alvo.id}/papel`, {
    headers: profAuth, data: { NovoPapel: 'Professor' },
  });
  expect(papel.status()).toBe(403);

  const definitivo = await request.delete(`/api/usuarios/${alvo.id}/definitivo`, { headers: profAuth });
  expect(definitivo.status()).toBe(403);

  const reset = await request.post(`/api/usuarios/${alvo.id}/2fa/reset`, { headers: profAuth });
  expect(reset.status()).toBe(403);

  // Mas lista e cria — é o que GestaoUsuarios lhe dá.
  const lista = await request.get('/api/usuarios', { headers: profAuth });
  expect(lista.ok()).toBeTruthy();
});
