import { test, expect } from '@playwright/test';

async function loginAndNavigate(page, navLabel) {
  await page.goto('/');
  await page.getByLabel('Senha', { exact: true }).fill('Admin@123');
  await page.getByRole('button', { name: /Entrar/ }).click();
  await page.getByRole('button', { name: 'Dashboard' }).waitFor({ timeout: 2000 });
  // Use regex to match nav buttons that may include a badge count
  await page.getByRole('button', { name: new RegExp(navLabel.replace(/[/\\^$*+?.()|[\]{}]/g, '\\$&')) }).click();
}

test('shows the relatorios screen with the six report cards', async ({ page }) => {
  await loginAndNavigate(page, 'Relatórios · PGRS');
  await expect(page.getByText('Relatórios e PGRS')).toBeVisible();
  // .first() — os títulos também aparecem nas linhas do histórico de relatórios
  await expect(page.getByText('PGRS Anual').first()).toBeVisible();
  await expect(page.getByText('Inventário de reagentes').first()).toBeVisible();
  await expect(page.getByText('Declaração SINIR trimestral').first()).toBeVisible();
  await expect(page.getByRole('button', { name: /Gerar/ })).toHaveCount(6);
});

test('shows the report history section', async ({ page }) => {
  await loginAndNavigate(page, 'Relatórios · PGRS');
  await expect(page.getByText('Histórico de relatórios gerados')).toBeVisible();
});

test('generating a report downloads a CSV and adds it to the history', async ({ page }) => {
  await loginAndNavigate(page, 'Relatórios · PGRS');
  const card = page.locator('.card').filter({ hasText: 'Inventário de reagentes' });
  const downloadPromise = page.waitForEvent('download', { timeout: 10_000 });
  await card.getByRole('button', { name: /Gerar/ }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.csv$/);
  // The new report shows up in the history table
  const historico = page.locator('.card').filter({ hasText: 'Histórico de relatórios gerados' });
  await expect(historico.getByText('Inventário de reagentes').first()).toBeVisible({ timeout: 5000 });
  await expect(historico.getByRole('button', { name: /Baixar/ }).first()).toBeVisible();
});

test('downloading from the history works', async ({ page }) => {
  await loginAndNavigate(page, 'Relatórios · PGRS');
  const historico = page.locator('.card').filter({ hasText: 'Histórico de relatórios gerados' });
  const baixar = historico.getByRole('button', { name: /Baixar/ }).first();
  await baixar.waitFor({ timeout: 5000 });
  const downloadPromise = page.waitForEvent('download', { timeout: 10_000 });
  await baixar.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.csv$/);
});
