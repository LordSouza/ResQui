import { test, expect } from '@playwright/test';
import { apiAuth, criarResiduoAguardandoColeta } from './seed';

async function loginAndNavigate(page, navLabel) {
  await page.goto('/');
  await page.getByLabel('Senha', { exact: true }).fill('Admin@123');
  await page.getByRole('button', { name: /Entrar/ }).click();
  await page.getByRole('button', { name: 'Dashboard' }).waitFor({ timeout: 2000 });
  // Use regex to match nav buttons that may include a badge count
  await page.getByRole('button', { name: new RegExp(navLabel.replace(/[/\\^$*+?.()|[\]{}]/g, '\\$&')) }).click();
}

test('shows MTR list on the Pré-MTR screen', async ({ page }) => {
  await loginAndNavigate(page, 'Pré-MTR / SINIR');
  await expect(page.getByText('MTRs emitidos')).toBeVisible();
});

test('Novo Pré-MTR modal opens with default values', async ({ page }) => {
  await loginAndNavigate(page, 'Pré-MTR / SINIR');
  await page.getByRole('button', { name: /Novo Pré-MTR/i }).click();
  await expect(page.locator('.modal-title', { hasText: 'Novo Pré-MTR' })).toBeVisible();
  await expect(page.getByLabel('Gerador')).toHaveValue('Unifei');
  await expect(page.getByRole('button', { name: /Criar Pré-MTR/ })).toBeVisible();
});

test('new MTR appears in the list after creating with a selected resíduo', async ({ page, request }) => {
  // Garante um resíduo aguardando coleta para vincular ao MTR
  const auth = await apiAuth(request);
  await criarResiduoAguardandoColeta(request, auth);

  await loginAndNavigate(page, 'Pré-MTR / SINIR');
  const mtrTable = page.locator('.card').filter({ hasText: 'MTRs emitidos' }).locator('tbody tr');
  const countBefore = await mtrTable.count();

  await page.getByRole('button', { name: /Novo Pré-MTR/i }).click();
  await expect(page.locator('.modal-title', { hasText: 'Novo Pré-MTR' })).toBeVisible();
  const checkbox = page.locator('.modal input[type="checkbox"]').first();
  await checkbox.waitFor({ timeout: 3000 });
  await checkbox.check();
  await page.getByRole('button', { name: /Criar Pré-MTR \(1\)/ }).click();
  await expect(page.getByRole('button', { name: /Criar Pré-MTR/ })).not.toBeVisible({ timeout: 3000 });

  await expect(async () => {
    expect(await mtrTable.count()).toBeGreaterThan(countBefore);
  }).toPass({ timeout: 5000 });
});
