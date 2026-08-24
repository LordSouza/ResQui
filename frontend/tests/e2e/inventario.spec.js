import { test, expect } from '@playwright/test';
import { apiAuth, ensureReagente } from './seed';

async function loginAndNavigate(page, navLabel) {
  await page.goto('/');
  await page.getByLabel('Senha', { exact: true }).fill('Admin@123');
  await page.getByRole('button', { name: /Entrar/ }).click();
  await page.getByRole('button', { name: 'Início' }).waitFor({ timeout: 2000 });
  await page.getByRole('button', { name: navLabel }).click();
}

async function seedReagentes(request) {
  const auth = await apiAuth(request);
  await ensureReagente(request, auth, { nome: 'Ácido Clorídrico', cas: '7647-01-0', classe: 1 });
  await ensureReagente(request, auth, { nome: 'Ácido Sulfúrico', cas: '7664-93-9', classe: 1 });
}

test('shows the inventory screen with reagent list', async ({ page, request }) => {
  await seedReagentes(request);
  await loginAndNavigate(page, 'Inventário');
  await expect(page.getByRole('heading', { name: 'Inventário de reagentes' })).toBeVisible();
  await expect(page.getByText('Ácido Clorídrico').first()).toBeVisible();
});

test('filter reduces the reagent list', async ({ page, request }) => {
  await seedReagentes(request);
  await loginAndNavigate(page, 'Inventário');
  // Ancora o estado inicial: sem isto, a asserção de ausência abaixo passaria por
  // vacuidade caso a lista simplesmente não renderizasse.
  await expect(page.getByText(/clorídrico/i).first()).toBeVisible();

  await page.getByPlaceholder(/Buscar por nome/i).fill('Sulfúrico');
  // toHaveCount tem retry automático — cobre o debounce de 300ms da busca server-side.
  // Regex ampla porque o seed demo também traz um "Ácido clorídrico 37%": depois do
  // filtro nenhum clorídrico pode restar, seja o semeado aqui ou o do demo.
  await expect(page.getByText(/clorídrico/i)).toHaveCount(0);
  await expect(page.getByText('Ácido Sulfúrico').first()).toBeVisible();
});

test('clicking a reagent opens the detail screen', async ({ page, request }) => {
  await seedReagentes(request);
  await loginAndNavigate(page, 'Inventário');
  await page.getByText('Ácido Clorídrico').first().click();
  await expect(page.getByRole('button', { name: /Baixar consumo/i })).toBeVisible();
});

test('Novo reagente modal opens, accepts input, and submits', async ({ page }) => {
  await loginAndNavigate(page, 'Inventário');
  await page.getByRole('button', { name: /Novo reagente/i }).click();
  await expect(page.getByText('Novo reagente').first()).toBeVisible();
  await page.getByPlaceholder(/ex: Ácido Acético/i).fill('Reagente E2E');
  await page.getByPlaceholder('64-19-7').fill('0001-01-1');
  await page.getByRole('button', { name: /Cadastrar reagente/i }).click();
  await expect(page.getByText('Reagente E2E').first()).toBeVisible({ timeout: 2000 });
});
