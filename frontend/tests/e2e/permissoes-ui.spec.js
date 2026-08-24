// Gates de papel na interface: as telas escondem o que a API recusaria com 403 (ver
// src/auth/permissoes.js, espelho de Program.cs:110-115). A autorização real continua sendo do
// servidor — coberta por seguranca.spec.js, que exercita os endpoints direto. Aqui o que se
// verifica é a UI não oferecer o que o papel não alcança, e não esconder o que ele alcança.
import { test, expect } from '@playwright/test';
import { apiAuth } from './seed.js';

const SENHA = 'Perm@2026x';

async function usuarioCom(request, papel) {
  const auth = await apiAuth(request);
  const email = `permui_${papel.toLowerCase()}_${Date.now()}@resqui.local`;
  const res = await request.post('/api/auth/register', {
    headers: auth,
    data: { Email: email, Senha: SENHA, Papel: papel, Nome: `Perm ${papel}` },
  });
  expect(res.ok(), `falha ao criar usuário ${papel}`).toBeTruthy();
  return email;
}

async function login(page, email, senha = SENHA) {
  await page.goto('/');
  await page.locator('input[type="email"]').fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(senha);
  await page.getByRole('button', { name: /Entrar/ }).click();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15000 });
}

const sidebar = (page) => page.locator('.sidebar');
const irPara = (page, label) => sidebar(page).getByRole('button', { name: label }).click();

test('Visualizador não recebe nenhuma ação de escrita, mas mantém leitura e exportação', async ({ page, request }) => {
  await login(page, await usuarioCom(request, 'Visualizador'));

  // Navegação: telas cujo conteúdo inteiro exige papel somem da sidebar.
  await expect(sidebar(page).getByRole('button', { name: 'Auditoria' })).toHaveCount(0);
  await expect(sidebar(page).getByRole('button', { name: 'Usuários' })).toHaveCount(0);
  await expect(sidebar(page).getByRole('button', { name: 'Inventário' })).toBeVisible();

  await irPara(page, 'Resíduos');
  await expect(page.getByRole('button', { name: /Registrar resíduo/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Exportar lista/i })).toBeVisible();

  await irPara(page, 'Inventário');
  await expect(page.getByRole('button', { name: /Novo reagente/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Importar CSV/i })).toHaveCount(0);

  await irPara(page, 'Laboratórios');
  await expect(page.getByRole('button', { name: /Novo laboratório/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Exportar planta/i })).toBeVisible();

  await irPara(page, 'Manifestos');
  await expect(page.getByRole('button', { name: /Novo Pré-MTR/i })).toHaveCount(0);

  await irPara(page, 'Relatórios');
  await expect(page.getByRole('button', { name: /^Gerar$/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Configurar PGRS/i })).toHaveCount(0);
});

test('Pesquisador registra resíduo mas não emite MTR nem cadastra reagente', async ({ page, request }) => {
  await login(page, await usuarioCom(request, 'Pesquisador'));

  await irPara(page, 'Resíduos');
  await expect(page.getByRole('button', { name: /Registrar resíduo/i })).toBeVisible();

  await irPara(page, 'Manifestos');
  await expect(page.getByRole('button', { name: /Novo Pré-MTR/i })).toHaveCount(0);

  await irPara(page, 'Inventário');
  await expect(page.getByRole('button', { name: /Novo reagente/i })).toHaveCount(0);
});

test('Professor vê Auditoria mas não Usuários — policies diferentes', async ({ page, request }) => {
  await login(page, await usuarioCom(request, 'Professor'));

  await expect(sidebar(page).getByRole('button', { name: 'Auditoria' })).toBeVisible();
  await expect(sidebar(page).getByRole('button', { name: 'Usuários' })).toHaveCount(0);
});

test('Tecnico emite MTR e edita resíduo, mas não cadastra reagente nem gera relatório', async ({ page, request }) => {
  await login(page, await usuarioCom(request, 'Tecnico'));

  await irPara(page, 'Manifestos');
  await expect(page.getByRole('button', { name: /Novo Pré-MTR/i })).toBeVisible();

  await irPara(page, 'Inventário');
  await expect(page.getByRole('button', { name: /Novo reagente/i })).toHaveCount(0);

  await irPara(page, 'Relatórios');
  await expect(page.getByRole('button', { name: /^Gerar$/i })).toHaveCount(0);

  await expect(sidebar(page).getByRole('button', { name: 'Auditoria' })).toHaveCount(0);
});

test('Admin continua vendo todas as ações', async ({ page }) => {
  await login(page, 'admin@resqui.local', 'Admin@123');

  await expect(sidebar(page).getByRole('button', { name: 'Auditoria' })).toBeVisible();
  await expect(sidebar(page).getByRole('button', { name: 'Usuários' })).toBeVisible();

  await irPara(page, 'Inventário');
  await expect(page.getByRole('button', { name: /Novo reagente/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Importar CSV/i })).toBeVisible();

  await irPara(page, 'Laboratórios');
  await expect(page.getByRole('button', { name: /Novo laboratório/i })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Remover laboratório' }).first()).toBeVisible();
});
