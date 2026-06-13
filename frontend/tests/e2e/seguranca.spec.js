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
