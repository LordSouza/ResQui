import { test, expect } from '@playwright/test';

test('shows the login screen on first load', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Entrar no ResQui')).toBeVisible();
});

test('shows validation error for empty email', async ({ page }) => {
  await page.goto('/');
  await page.locator('input[type="email"]').fill('');
  await page.getByRole('button', { name: /Entrar/ }).click();
  await expect(page.getByText('Informe e-mail e senha.')).toBeVisible();
});

// Note: HTML5 email input prevents submit before React validation fires,
// so invalid-format validation is covered by the RTL component tests instead.
test('email field is pre-filled with institutional address', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('input[type="email"]')).toHaveValue('lucas.souza@instituto.example');
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
