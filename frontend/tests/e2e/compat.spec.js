import { test, expect } from '@playwright/test';

async function loginAndNavigate(page, navLabel) {
  await page.goto('/');
  await page.getByRole('button', { name: /Entrar/ }).click();
  await page.getByRole('button', { name: 'Dashboard' }).waitFor({ timeout: 2000 });
  await page.getByRole('button', { name: navLabel }).click();
}

test('shows the compatibility checker screen', async ({ page }) => {
  await loginAndNavigate(page, 'Compatibilidade');
  await expect(page.getByText('Motor de compatibilidade química')).toBeVisible();
});

test('default pair (HCl + H2O2 30%) shows Proibido result', async ({ page }) => {
  await loginAndNavigate(page, 'Compatibilidade');
  // Default: R-00128 (classe 1) + R-00135 (classe 11) → level 3 = Proibido
  await expect(page.getByText(/Proibido/)).toBeVisible();
});

test('selecting two class-5 reagents shows Compatíveis result', async ({ page }) => {
  await loginAndNavigate(page, 'Compatibilidade');
  const selects = page.locator('select');
  // Slot A: R-00131 Metanol (classe 5)
  await selects.first().selectOption('R-00131');
  // Slot B: R-00132 Etanol Absoluto (classe 5) → COMPAT_MATRIX[5][4] = 0
  await selects.nth(1).selectOption('R-00132');
  await expect(page.getByText(/Compatíveis/)).toBeVisible();
});

test('selecting incompatible pair (acid + base) shows Proibido result', async ({ page }) => {
  await loginAndNavigate(page, 'Compatibilidade');
  const selects = page.locator('select');
  // Slot A: R-00128 Ácido Clorídrico (classe 1)
  await selects.first().selectOption('R-00128');
  // Slot B: R-00130 Hidróxido de Sódio (classe 3) → COMPAT_MATRIX[1][2] = 3
  await selects.nth(1).selectOption('R-00130');
  await expect(page.getByText(/Proibido/)).toBeVisible();
});

test('selecting cautela pair shows Cautela result', async ({ page }) => {
  await loginAndNavigate(page, 'Compatibilidade');
  const selects = page.locator('select');
  // Slot A: R-00128 Ácido Clorídrico (classe 1)
  await selects.first().selectOption('R-00128');
  // Slot B: R-00131 Metanol (classe 5) → COMPAT_MATRIX[1][4] = 1 = Cautela
  await selects.nth(1).selectOption('R-00131');
  await expect(page.getByText(/Cautela/)).toBeVisible();
});
