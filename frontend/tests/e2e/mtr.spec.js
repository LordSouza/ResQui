import { test, expect } from '@playwright/test';
import { apiAuth, criarResiduoAguardandoColeta, seedPgrsConfig, PGRS_CONFIG_E2E } from './seed';

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

test('Novo Pré-MTR modal opens with default values', async ({ page, request }) => {
  // Semeia a config PGRS com um gerador conhecido — os campos do modal vêm de
  // GET /api/pgrs-config, não de valores chumbados no front.
  const auth = await apiAuth(request);
  await seedPgrsConfig(request, auth);

  await loginAndNavigate(page, 'Pré-MTR / SINIR');
  await page.getByRole('button', { name: /Novo Pré-MTR/i }).click();
  await expect(page.locator('.modal-title', { hasText: 'Novo Pré-MTR' })).toBeVisible();
  await expect(page.getByLabel('Gerador')).toHaveValue(PGRS_CONFIG_E2E.GeradorPadrao);
  await expect(page.getByRole('button', { name: /Criar Pré-MTR/ })).toBeVisible();
});

test('new MTR appears in the list after creating with a selected resíduo', async ({ page, request }) => {
  // Garante um resíduo aguardando coleta para vincular ao MTR e uma config PGRS
  // conhecida (Gerador/Transportador não podem nascer vazios — o backend rejeita).
  const auth = await apiAuth(request);
  await criarResiduoAguardandoColeta(request, auth);
  await seedPgrsConfig(request, auth);

  await loginAndNavigate(page, 'Pré-MTR / SINIR');
  const mtrTable = page.locator('.card').filter({ hasText: 'MTRs emitidos' }).locator('tbody tr');
  const countBefore = await mtrTable.count();

  await page.getByRole('button', { name: /Novo Pré-MTR/i }).click();
  await expect(page.locator('.modal-title', { hasText: 'Novo Pré-MTR' })).toBeVisible();
  // Espera a config PGRS resolver e preencher Gerador/Transportador antes de criar
  // (o useQuery de pgrs-config é independente do de resíduos — sem isso, o clique
  // pode disparar antes dos campos serem preenchidos).
  await expect(page.getByLabel('Gerador')).toHaveValue(PGRS_CONFIG_E2E.GeradorPadrao);
  await expect(page.getByLabel('Transportador')).toHaveValue(PGRS_CONFIG_E2E.TransportadorPadrao);
  const checkbox = page.locator('.modal input[type="checkbox"]').first();
  await checkbox.waitFor({ timeout: 3000 });
  await checkbox.check();
  await page.getByRole('button', { name: /Criar Pré-MTR \(1\)/ }).click();
  await expect(page.getByRole('button', { name: /Criar Pré-MTR/ })).not.toBeVisible({ timeout: 3000 });

  await expect(async () => {
    expect(await mtrTable.count()).toBeGreaterThan(countBefore);
  }).toPass({ timeout: 5000 });
});
