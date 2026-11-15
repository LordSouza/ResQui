// Cadeia de hash da auditoria contra o PostgreSQL real: o gatilho encadeia cada inclusão e a
// verificação recalcula a cadeia inteira. Gatilhos, adulteração e backfill são cobertos em
// backend/ResQui.Tests.Integracao; aqui fica o caminho do usuário e a autorização.
import { test, expect } from '@playwright/test';
import { ADMIN, apiAuth, todosLaboratorios } from './seed.js';

const SENHA = 'Audit@2026x';

async function professor(request) {
  const auth = await apiAuth(request);
  const email = `audit_prof_${Date.now()}@resqui.local`;
  const res = await request.post('/api/auth/register', {
    headers: auth,
    data: { Email: email, Senha: SENHA, Papel: 'Professor', Nome: 'Audit Professor', LaboratorioIds: await todosLaboratorios(request, auth) },
  });
  expect(res.ok()).toBeTruthy();
  const login = await request.post('/api/auth/login', { data: { Email: email, Senha: SENHA } });
  return { Authorization: `Bearer ${(await login.json()).token}` };
}

test('verificação é exclusiva do Admin e a âncora fica disponível para quem exporta', async ({ request }) => {
  const admin = await apiAuth(request);

  const verificacao = await request.get('/api/auditoria/verificacao', { headers: admin });
  expect(verificacao.status()).toBe(200);
  const r = await verificacao.json();
  expect(r.integra).toBe(true);
  expect(r.primeiraSequenciaInvalida).toBeNull();
  expect(r.ultimoHash).toMatch(/^[0-9a-f]{64}$/);

  const ancora = await (await request.get('/api/auditoria/ancora', { headers: admin })).json();
  expect(ancora.ultimaSequencia).toBeGreaterThan(r.ultimaSequencia);
  expect(ancora.prefixoHash).toBe(ancora.ultimoHash.slice(0, 16));

  const prof = await professor(request);
  expect((await request.get('/api/auditoria/verificacao', { headers: prof })).status()).toBe(403);
  expect((await request.get('/api/auditoria/ancora', { headers: prof })).status()).toBe(200);
});

test('Admin verifica a cadeia pela tela de auditoria', async ({ page }) => {
  await page.goto('/');
  await page.locator('input[type="email"]').fill(ADMIN.email);
  await page.getByLabel('Senha', { exact: true }).fill(ADMIN.senha);
  await page.getByRole('button', { name: /Entrar/ }).click();
  await page.locator('.sidebar').getByRole('button', { name: 'Auditoria' }).click();

  await page.getByRole('button', { name: 'Verificar agora' }).click();

  await expect(page.getByText(/Cadeia íntegra · \d+ registros · verificado em/)).toBeVisible();
  await expect(page.locator('.audit-row .what', { hasText: 'auditoria.verificar' }).first()).toBeVisible();
});
