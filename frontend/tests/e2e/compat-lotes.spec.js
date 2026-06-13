import { test, expect } from '@playwright/test';
import { apiAuth, ensureReagente, criarResiduoComClasses } from './seed';

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

test('downloads de rótulo PDF, MTR PDF e CSV SINIR retornam arquivos', async ({ request }) => {
  const auth = await apiAuth(request);
  const reag = await ensureReagente(request, auth, { nome: 'Reag PDF E2E', cas: '222-22-2', classe: 5 });

  const rotulo = await request.get(`/api/reagentes/${reag.id}/rotulo`, { headers: auth });
  expect(rotulo.ok()).toBeTruthy();
  expect(rotulo.headers()['content-type']).toContain('application/pdf');

  // cria um MTR para exercitar os downloads
  const r = await (await criarResiduoComClasses(request, auth, [5], { Risco: 'baixo' })).json();
  const mtr = await (await request.post('/api/mtrs', {
    headers: auth, data: { Gerador: 'Unifei', Transportadora: 'EcoLog', ResiduoIds: [r.id] },
  })).json();

  const pdf = await request.get(`/api/mtrs/${mtr.id}/pdf`, { headers: auth });
  expect(pdf.ok()).toBeTruthy();
  expect(pdf.headers()['content-type']).toContain('application/pdf');

  const csv = await request.get(`/api/mtrs/${mtr.id}/export-sinir`, { headers: auth });
  expect(csv.ok()).toBeTruthy();
  expect(csv.headers()['content-type']).toContain('text/csv');
  expect(await csv.text()).toContain('manifesto;data_emissao');
});
