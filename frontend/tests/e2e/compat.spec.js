import { test, expect } from '@playwright/test';
import { apiAuth, ensureReagente } from './seed';

async function loginAndNavigate(page, navLabel) {
  await page.goto('/');
  await page.getByLabel('Senha', { exact: true }).fill('Admin@123');
  await page.getByRole('button', { name: /Entrar/ }).click();
  await page.getByRole('button', { name: 'Dashboard' }).waitFor({ timeout: 2000 });
  await page.getByRole('button', { name: navLabel }).click();
}

async function seedReagentes(request) {
  const auth = await apiAuth(request);
  await ensureReagente(request, auth, { nome: 'Ácido Clorídrico', cas: '7647-01-0', classe: 1 });
  await ensureReagente(request, auth, { nome: 'Hidróxido de Sódio', cas: '1310-73-2', classe: 3 });
  await ensureReagente(request, auth, { nome: 'Metanol', cas: '67-56-1', classe: 5 });
  await ensureReagente(request, auth, { nome: 'Etanol Absoluto', cas: '64-17-5', classe: 5 });
}

// Seleciona uma opção pelo texto visível ("Nome (R-00001)")
async function selectByName(page, selectId, nome) {
  const option = page.locator(`#${selectId} option`, { hasText: nome }).first();
  await option.waitFor({ state: 'attached' });
  await page.locator(`#${selectId}`).selectOption(await option.getAttribute('value'));
}

test('shows the compatibility checker screen', async ({ page }) => {
  await loginAndNavigate(page, 'Compatibilidade');
  await expect(page.getByText('Motor de compatibilidade química')).toBeVisible();
});

test('selecting two class-5 reagents shows Compatíveis result', async ({ page, request }) => {
  await seedReagentes(request);
  await loginAndNavigate(page, 'Compatibilidade');
  await selectByName(page, 'compat-select-a', 'Metanol');
  await selectByName(page, 'compat-select-b', 'Etanol Absoluto');
  await expect(page.getByText(/Compatíveis/)).toBeVisible();
});

test('selecting incompatible pair (acid + base) shows Proibido result', async ({ page, request }) => {
  await seedReagentes(request);
  await loginAndNavigate(page, 'Compatibilidade');
  await selectByName(page, 'compat-select-a', 'Ácido Clorídrico');
  await selectByName(page, 'compat-select-b', 'Hidróxido de Sódio');
  await expect(page.getByText(/Proibido/)).toBeVisible();
});

test('selecting cautela pair shows Cautela result', async ({ page, request }) => {
  await seedReagentes(request);
  await loginAndNavigate(page, 'Compatibilidade');
  await selectByName(page, 'compat-select-a', 'Ácido Clorídrico');
  await selectByName(page, 'compat-select-b', 'Metanol');
  await expect(page.getByText(/Cautela/)).toBeVisible();
});
