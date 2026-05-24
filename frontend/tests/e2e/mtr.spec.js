import { test, expect } from '@playwright/test';

async function loginAndNavigate(page, navLabel) {
  await page.goto('/');
  await page.getByRole('button', { name: /Entrar/ }).click();
  await page.getByRole('button', { name: 'Dashboard' }).waitFor({ timeout: 2000 });
  await page.getByRole('button', { name: navLabel }).click();
}

test('shows MTR list on the Pré-MTR screen', async ({ page }) => {
  await loginAndNavigate(page, 'Pré-MTR / SINIR');
  await expect(page.getByText('MTRs emitidos')).toBeVisible();
  await expect(page.getByText('MTR-2025-1143')).toBeVisible();
});

test('Novo Pré-MTR modal opens with default values', async ({ page }) => {
  await loginAndNavigate(page, 'Pré-MTR / SINIR');
  await page.getByRole('button', { name: /Novo Pré-MTR/i }).click();
  await expect(page.getByText('Novo Pré-MTR')).toBeVisible();
  await expect(page.getByText('EcoLog Transportes')).toBeVisible();
});

test('submitting the form closes the modal', async ({ page }) => {
  await loginAndNavigate(page, 'Pré-MTR / SINIR');
  await page.getByRole('button', { name: /Novo Pré-MTR/i }).click();
  await expect(page.getByText('Novo Pré-MTR')).toBeVisible();
  await page.getByRole('button', { name: /Criar Pré-MTR/ }).click();
  await expect(page.getByRole('button', { name: /Criar Pré-MTR/ })).not.toBeVisible({ timeout: 2000 });
});

test('new MTR appears in the list after creation', async ({ page }) => {
  await loginAndNavigate(page, 'Pré-MTR / SINIR');
  const mtrTable = page.locator('.card').filter({ hasText: 'MTRs emitidos' }).locator('tbody tr');
  const countBefore = await mtrTable.count();
  await page.getByRole('button', { name: /Novo Pré-MTR/i }).click();
  await page.getByRole('button', { name: /Criar Pré-MTR/ }).click();
  await expect(page.getByRole('button', { name: /Criar Pré-MTR/ })).not.toBeVisible({ timeout: 2000 });
  const countAfter = await mtrTable.count();
  expect(countAfter).toBeGreaterThan(countBefore);
});
