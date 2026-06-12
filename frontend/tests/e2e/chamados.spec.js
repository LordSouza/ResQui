import { test, expect } from '@playwright/test';

async function loginAndNavigate(page, navLabel) {
  await page.goto('/');
  await page.getByLabel('Senha', { exact: true }).fill('Admin@123');
  await page.getByRole('button', { name: /Entrar/ }).click();
  await page.getByRole('button', { name: 'Dashboard' }).waitFor({ timeout: 2000 });
  // Use regex to match nav buttons that may include a badge count
  await page.getByRole('button', { name: new RegExp(navLabel.replace(/[/\\^$*+?.()|[\]{}]/g, '\\$&')) }).click();
}

test('shows the chamados screen with KPIs', async ({ page }) => {
  await loginAndNavigate(page, 'Chamados');
  await expect(page.getByText('Chamados de suporte')).toBeVisible();
  await expect(page.getByRole('button', { name: /Filtrar: Abertos/ })).toBeVisible();
  await expect(page.getByText('Críticos pendentes')).toBeVisible();
});

test('Novo chamado modal opens with default values', async ({ page }) => {
  await loginAndNavigate(page, 'Chamados');
  await page.getByRole('button', { name: /Novo chamado/i }).click();
  await expect(page.locator('.modal-title', { hasText: 'Novo chamado' })).toBeVisible();
  await expect(page.getByLabel('Título')).toBeVisible();
  await expect(page.getByRole('button', { name: /Abrir chamado/ })).toBeVisible();
});

test('new chamado appears in the list after creation', async ({ page }) => {
  await loginAndNavigate(page, 'Chamados');
  const titulo = `E2E chamado ${Date.now()}`;
  await page.getByRole('button', { name: /Novo chamado/i }).click();
  await page.getByLabel('Título').fill(titulo);
  await page.getByLabel('Descrição').fill('Chamado criado pelo teste E2E do Playwright.');
  await page.getByRole('button', { name: /Abrir chamado/ }).click();
  await expect(page.locator('.modal-title')).not.toBeVisible({ timeout: 3000 });
  await expect(page.getByRole('cell', { name: titulo })).toBeVisible({ timeout: 3000 });
});

test('clicking a chamado opens the detail drawer', async ({ page }) => {
  await loginAndNavigate(page, 'Chamados');
  const firstRow = page.locator('table.tbl tbody tr').first();
  await firstRow.waitFor({ timeout: 3000 });
  await firstRow.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog').getByText('Descrição')).toBeVisible();
});

test('full lifecycle: create, analyse, comment and resolve a chamado', async ({ page }) => {
  await loginAndNavigate(page, 'Chamados');
  const titulo = `E2E ciclo ${Date.now()}`;
  await page.getByRole('button', { name: /Novo chamado/i }).click();
  await page.getByLabel('Título').fill(titulo);
  await page.getByLabel('Descrição').fill('Ciclo de vida completo via E2E.');
  await page.getByRole('button', { name: /Abrir chamado/ }).click();
  await expect(page.locator('.modal-title')).not.toBeVisible({ timeout: 3000 });

  // Open the drawer for the freshly created chamado
  await page.getByRole('cell', { name: titulo }).click();
  const drawer = page.getByRole('dialog');
  await expect(drawer).toBeVisible();

  // aberto → em-analise
  await drawer.getByRole('button', { name: /Em análise/ }).click();
  await expect(drawer.getByText('Em análise').first()).toBeVisible({ timeout: 3000 });

  // Add a comment
  await drawer.getByLabel('Comentário').fill('Comentário de teste E2E.');
  await drawer.getByRole('button', { name: /Publicar comentário/ }).click();
  await expect(drawer.getByText('Comentário de teste E2E.')).toBeVisible({ timeout: 3000 });

  // em-analise → resolvido
  await drawer.getByRole('button', { name: /Resolver/ }).click();
  await expect(drawer.getByRole('button', { name: /Reabrir/ })).toBeVisible({ timeout: 3000 });
});
