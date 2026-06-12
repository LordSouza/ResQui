import { test, expect } from '@playwright/test';
import { apiAuth, ensureLab } from './seed';

async function loginAndNavigate(page, navLabel) {
  await page.goto('/');
  await page.getByLabel('Senha', { exact: true }).fill('Admin@123');
  await page.getByRole('button', { name: /Entrar/ }).click();
  await page.getByRole('button', { name: 'Dashboard' }).waitFor({ timeout: 2000 });
  // Use regex to match nav buttons that may include a badge count
  await page.getByRole('button', { name: new RegExp(navLabel.replace(/[/\\^$*+?.()|[\]{}]/g, '\\$&')) }).click();
}

test('shows the residuos screen with status tabs', async ({ page }) => {
  await loginAndNavigate(page, 'Resíduos');
  await expect(page.getByText('Resíduos químicos')).toBeVisible();
  await expect(page.getByRole('button', { name: /Aguardando coleta/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Em coleta/ })).toBeVisible();
});

test('Registrar resíduo modal opens with required fields', async ({ page }) => {
  await loginAndNavigate(page, 'Resíduos');
  await page.getByRole('button', { name: /Registrar resíduo/ }).first().click();
  await expect(page.locator('.modal-title', { hasText: 'Registrar resíduo' })).toBeVisible();
  await expect(page.getByLabel('Tipo de resíduo *')).toBeVisible();
  await expect(page.getByLabel('Volume', { exact: true })).toBeVisible();
});

test('new resíduo appears in the list after creation', async ({ page, request }) => {
  // Garante que existe ao menos um laboratório para selecionar no form
  await ensureLab(request, await apiAuth(request));

  await loginAndNavigate(page, 'Resíduos');
  const composicao = `Mistura E2E ${Date.now()}`;
  await page.getByRole('button', { name: /Registrar resíduo/ }).first().click();
  await page.getByLabel('Volume', { exact: true }).fill('1.5');
  await page.getByLabel(/Composição declarada/).fill(composicao);
  // Espera as options carregarem (useLaboratorios) antes de selecionar,
  // senão o change event corre contra o re-render do React
  await page.locator('#residuo-lab option').nth(1).waitFor({ state: 'attached' });
  await page.locator('#residuo-lab').selectOption({ index: 1 });
  await page.locator('.modal-foot').getByRole('button', { name: /Registrar resíduo/ }).click();
  await expect(page.locator('.modal-title')).not.toBeVisible({ timeout: 3000 });
  await expect(page.getByRole('cell', { name: composicao })).toBeVisible({ timeout: 3000 });
});

test('search filters the residuos list', async ({ page }) => {
  await loginAndNavigate(page, 'Resíduos');
  await page.getByLabel('Buscar resíduo').fill('xxx-sem-resultado-xxx');
  await expect(page.locator('table.tbl tbody tr')).toHaveCount(0);
});
