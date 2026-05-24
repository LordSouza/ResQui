import { test, expect } from '@playwright/test';

async function loginAndNavigate(page, navLabel) {
  await page.goto('/');
  await page.getByRole('button', { name: /Entrar/ }).click();
  await page.getByRole('button', { name: 'Dashboard' }).waitFor({ timeout: 2000 });
  await page.getByRole('button', { name: navLabel }).click();
}

test('shows the inventory screen with reagent list', async ({ page }) => {
  await loginAndNavigate(page, 'Inventário');
  await expect(page.getByRole('heading', { name: 'Inventário de reagentes' })).toBeVisible();
  await expect(page.getByText('Ácido Clorídrico')).toBeVisible();
});

test('filter reduces the reagent list', async ({ page }) => {
  await loginAndNavigate(page, 'Inventário');
  await page.getByPlaceholder(/Buscar por nome/i).fill('Sulfúrico');
  await expect(page.getByText('Ácido Sulfúrico')).toBeVisible();
  await expect(page.getByText('Ácido Clorídrico')).not.toBeVisible();
});

test('clicking a reagent opens the detail screen', async ({ page }) => {
  await loginAndNavigate(page, 'Inventário');
  await page.getByText('Ácido Clorídrico').click();
  await expect(page.getByRole('button', { name: /Baixar consumo/i })).toBeVisible();
});

test('Novo reagente modal opens, accepts input, and submits', async ({ page }) => {
  await loginAndNavigate(page, 'Inventário');
  await page.getByRole('button', { name: /Novo reagente/i }).click();
  await expect(page.getByText('Novo reagente').first()).toBeVisible();
  await page.getByPlaceholder(/ex: Ácido Acético/i).fill('Reagente E2E');
  await page.getByPlaceholder('64-19-7').fill('0001-01-1');
  await page.getByRole('button', { name: /Cadastrar reagente/i }).click();
  await expect(page.getByText('Reagente E2E')).toBeVisible({ timeout: 2000 });
});
