import { test, expect } from '@playwright/test';

test('shows the login screen on first load', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Entrar no ResQui')).toBeVisible();
});

test('shows validation error for empty email', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('E-mail institucional').fill('');
  await page.getByRole('button', { name: /Entrar/ }).click();
  await expect(page.getByText('Informe e-mail e senha.')).toBeVisible();
});

test('shows validation error for invalid email format', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('E-mail institucional').fill('not-an-email');
  await page.getByRole('button', { name: /Entrar/ }).click();
  await expect(page.getByText('E-mail inválido.')).toBeVisible();
});

test('redirects to dashboard after successful login', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Entrar/ }).click();
  await expect(page.getByRole('button', { name: 'Dashboard' })).toBeVisible({ timeout: 2000 });
});

test('shows the sidebar navigation after login', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Entrar/ }).click();
  await expect(page.getByRole('button', { name: 'Inventário' })).toBeVisible({ timeout: 2000 });
  await expect(page.getByRole('button', { name: 'Laboratórios' })).toBeVisible({ timeout: 2000 });
});
