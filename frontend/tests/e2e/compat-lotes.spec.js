import { test, expect } from '@playwright/test';
import { apiAuth, ensureReagente, criarResiduoComClasses, aprovarResiduo, todosLaboratorios } from './seed';

test('mistura de classes proibidas é bloqueada com 400', async ({ request }) => {
  const auth = await apiAuth(request);
  const res = await criarResiduoComClasses(request, auth, [1, 8]); // ácido × cianeto = Proibido
  expect(res.status()).toBe(400);
  const body = await res.json();
  expect(body.message).toContain('incompatível');
});

test('mistura compatível é aceita com 201', async ({ request }) => {
  const auth = await apiAuth(request);
  const res = await criarResiduoComClasses(request, auth, [5, 6], { Risco: 'baixo' }); // solventes = compatível
  expect(res.status()).toBe(201);
  const body = await res.json();
  expect(body.classesReatividade).toEqual([5, 6]);
});

test('MTR bloqueia agrupamento de resíduos com par proibido', async ({ request }) => {
  const auth = await apiAuth(request);
  const r1 = await (await criarResiduoComClasses(request, auth, [1])).json();   // ácido
  const r2 = await (await criarResiduoComClasses(request, auth, [8])).json();   // cianeto
  await aprovarResiduo(request, auth, r1.id); // RF06: aprova para chegar ao MTR
  await aprovarResiduo(request, auth, r2.id);
  const res = await request.post('/api/mtrs', {
    headers: auth,
    data: { Gerador: 'Unifei', Transportadora: 'EcoLog', ResiduoIds: [r1.id, r2.id] },
  });
  expect(res.status()).toBe(400);
  expect((await res.json()).message).toContain('Proibido');
});

test('lote criado soma ao estoque e baixa decrementa', async ({ request }) => {
  const auth = await apiAuth(request);
  const reag = await ensureReagente(request, auth, { nome: 'Reag Lote E2E', cas: '111-11-1', classe: 5 });

  const antes = (await (await request.get(`/api/reagentes/${reag.id}`, { headers: auth })).json()).estoque;

  const loteRes = await request.post(`/api/reagentes/${reag.id}/lotes`, {
    headers: auth,
    data: { Codigo: `LE2E-${Date.now()}`, Estoque: 3, Validade: '2030-01-01', Abertura: null },
  });
  expect(loteRes.status()).toBe(201);
  const lote = await loteRes.json();

  const depoisCriar = (await (await request.get(`/api/reagentes/${reag.id}`, { headers: auth })).json()).estoque;
  expect(depoisCriar).toBeCloseTo(antes + 3, 2);

  const baixaRes = await request.post(`/api/reagentes/${reag.id}/lotes/${lote.id}/baixa`, {
    headers: auth, data: { Quantidade: 1 },
  });
  expect(baixaRes.ok()).toBeTruthy();
  expect((await baixaRes.json()).estoque).toBeCloseTo(2, 2);

  // baixa acima do disponível no lote → 400
  const excesso = await request.post(`/api/reagentes/${reag.id}/lotes/${lote.id}/baixa`, {
    headers: auth, data: { Quantidade: 999 },
  });
  expect(excesso.status()).toBe(400);
});

test('Aluno dá baixa em lote mas não cria lote', async ({ request }) => {
  const auth = await apiAuth(request);
  const email = `aluno_lote_${Date.now()}@resqui.local`;
  const cadastro = await request.post('/api/auth/register', {
    headers: auth,
    data: { Email: email, Senha: 'Alun@123', Papel: 'Aluno', Nome: 'Aluno Lote E2E', LaboratorioIds: await todosLaboratorios(request, auth) },
  });
  expect(cadastro.ok(), 'falha ao criar o aluno do teste').toBeTruthy();
  const { token } = await (await request.post('/api/auth/login', { data: { Email: email, Senha: 'Alun@123' } })).json();
  const alunoAuth = { Authorization: `Bearer ${token}` };

  const reag = await ensureReagente(request, auth, { nome: 'Reag Lote Aluno E2E', cas: '333-33-3', classe: 5 });
  const lote = await (await request.post(`/api/reagentes/${reag.id}/lotes`, {
    headers: auth,
    data: { Codigo: `LALU-${Date.now()}`, Estoque: 5, Validade: '2030-01-01', Abertura: null },
  })).json();

  const baixa = await request.post(`/api/reagentes/${reag.id}/lotes/${lote.id}/baixa`, {
    headers: alunoAuth, data: { Quantidade: 2 },
  });
  expect(baixa.ok()).toBeTruthy();
  expect((await baixa.json()).estoque).toBeCloseTo(3, 2);

  const criacao = await request.post(`/api/reagentes/${reag.id}/lotes`, {
    headers: alunoAuth,
    data: { Codigo: `LALU2-${Date.now()}`, Estoque: 1, Validade: '2030-01-01', Abertura: null },
  });
  expect(criacao.status()).toBe(403);
});

test('downloads de rótulo PDF e MTR PDF retornam arquivos', async ({ request }) => {
  const auth = await apiAuth(request);
  const reag = await ensureReagente(request, auth, { nome: 'Reag PDF E2E', cas: '222-22-2', classe: 5 });

  const rotulo = await request.get(`/api/reagentes/${reag.id}/rotulo`, { headers: auth });
  expect(rotulo.ok()).toBeTruthy();
  expect(rotulo.headers()['content-type']).toContain('application/pdf');

  // cria um MTR para exercitar os downloads
  const r = await (await criarResiduoComClasses(request, auth, [5], { Risco: 'baixo' })).json();
  await aprovarResiduo(request, auth, r.id); // RF06: aprova para vincular ao MTR
  const mtr = await (await request.post('/api/mtrs', {
    headers: auth, data: { Gerador: 'Unifei', Transportadora: 'EcoLog', ResiduoIds: [r.id] },
  })).json();

  const pdf = await request.get(`/api/mtrs/${mtr.id}/pdf`, { headers: auth });
  expect(pdf.ok()).toBeTruthy();
  expect(pdf.headers()['content-type']).toContain('application/pdf');
});
