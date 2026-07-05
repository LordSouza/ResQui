import { test, expect } from '@playwright/test';
import { apiAuth } from './seed';

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

  const res = await request.post('/api/residuos', {
    headers: visuAuth,
    data: {
      Descricao: 'tentativa visu', LaboratorioId: 1, Tipo: 'x',
      Volume: 1, Unidade: 'L', Composicao: 'x', Risco: 'baixo', ClassesReatividade: [],
    },
  });
  expect(res.status()).toBe(403);

  // Mas pode ler
  const lista = await request.get('/api/residuos', { headers: visuAuth });
  expect(lista.ok()).toBeTruthy();
});

test('login com senha errada retorna 401', async ({ request }) => {
  const res = await request.post('/api/auth/login', { data: { Email: 'admin@resqui.local', Senha: 'errada' } });
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

test('setup 2FA retorna secret e URI otpauth', async ({ request }) => {
  const auth = await apiAuth(request);
  const res = await request.post('/api/auth/2fa/setup', { headers: auth });
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

  const criar = await request.post('/api/residuos', {
    headers: pesqAuth,
    data: {
      Descricao: 'descarte pesquisador', LaboratorioId: 1, Tipo: 'x',
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
  const criar = await request.post('/api/residuos', {
    headers: auth,
    data: {
      Descricao: 'descarte p/ professor', LaboratorioId: 1, Tipo: 'x',
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
  const criar = await request.post('/api/residuos', {
    headers: auth,
    data: {
      Descricao: 'descarte p/ bloqueio pesquisador', LaboratorioId: 1, Tipo: 'x',
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
