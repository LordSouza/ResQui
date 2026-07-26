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
  return {
    acido: await ensureReagente(request, auth, { nome: 'Ácido Clorídrico', cas: '7647-01-0', classe: 1 }),
    base: await ensureReagente(request, auth, { nome: 'Hidróxido de Sódio', cas: '1310-73-2', classe: 3 }),
    metanol: await ensureReagente(request, auth, { nome: 'Metanol', cas: '67-56-1', classe: 5 }),
    etanol: await ensureReagente(request, auth, { nome: 'Etanol Absoluto', cas: '64-17-5', classe: 5 }),
  };
}

// Seleciona pelo id do reagente semeado. Casar por nome não serve: o seed demo tem
// nomes que contêm os nossos ("Metanol P.A.", "Hidróxido de sódio P.A.") com outras
// classes de reatividade, e o primeiro casamento venceria — mudando o par avaliado.
async function selectById(page, selectId, reagenteId) {
  await page.locator(`#${selectId} option[value="${reagenteId}"]`).waitFor({ state: 'attached' });
  await page.locator(`#${selectId}`).selectOption(reagenteId);
}

test('shows the compatibility checker screen', async ({ page }) => {
  await loginAndNavigate(page, 'Compatibilidade');
  await expect(page.getByText('Motor de compatibilidade química')).toBeVisible();
});

test('selecting two class-5 reagents shows Compatíveis result', async ({ page, request }) => {
  const { metanol, etanol } = await seedReagentes(request);
  await loginAndNavigate(page, 'Compatibilidade');
  await selectById(page, 'compat-select-a', metanol.id);
  await selectById(page, 'compat-select-b', etanol.id);
  await expect(page.getByText(/Compatíveis/)).toBeVisible();
});

test('selecting incompatible pair (acid + base) shows Proibido result', async ({ page, request }) => {
  const { acido, base } = await seedReagentes(request);
  await loginAndNavigate(page, 'Compatibilidade');
  await selectById(page, 'compat-select-a', acido.id);
  await selectById(page, 'compat-select-b', base.id);
  await expect(page.getByText(/Proibido/)).toBeVisible();
});

test('selecting cautela pair shows Cautela result', async ({ page, request }) => {
  const { acido, metanol } = await seedReagentes(request);
  await loginAndNavigate(page, 'Compatibilidade');
  await selectById(page, 'compat-select-a', acido.id);
  await selectById(page, 'compat-select-b', metanol.id);
  await expect(page.getByText(/Cautela/)).toBeVisible();
});
