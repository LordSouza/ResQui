import { test, expect } from '@playwright/test';

test('pedido de redefinição responde 204 também para e-mail que não existe', async ({ request }) => {
  const pedido = await request.post('/api/auth/esqueci-senha', {
    data: { Email: `ninguem_${Date.now()}@resqui.local` },
  });

  expect(pedido.status()).toBe(204);
});

test('redefinir com token desconhecido devolve 400 com mensagem única', async ({ request }) => {
  const redefinicao = await request.post('/api/auth/redefinir-senha', {
    data: { Token: 'token-que-nao-existe', NovaSenha: 'Nova@Senha1' },
  });

  expect(redefinicao.status()).toBe(400);
  expect((await redefinicao.json()).message).toMatch(/Link inválido ou expirado/);
});

test('o link abre a tela de redefinição, tira o token da URL e mostra a recusa do servidor', async ({ page }) => {
  await page.goto('/?redefinir=token-que-nao-existe');

  await expect(page.getByRole('heading', { name: 'Redefinir senha' })).toBeVisible();
  await expect(page).not.toHaveURL(/redefinir=/);

  await page.getByLabel('Nova senha', { exact: true }).fill('Nova@Senha1');
  await page.getByLabel('Confirmar nova senha').fill('Nova@Senha1');
  await page.getByRole('button', { name: 'Salvar nova senha' }).click();

  await expect(page.getByText(/Link inválido ou expirado/)).toBeVisible();
});

test('"Esqueci minha senha" no login confirma o pedido sem dizer se a conta existe', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Esqueci minha senha' }).click();
  await page.getByLabel('E-mail da conta').fill(`ninguem_${Date.now()}@resqui.local`);
  await page.getByRole('button', { name: 'Enviar link' }).click();

  await expect(page.getByText(/Se houver uma conta com esse e-mail, enviamos um link válido por 1 hora/)).toBeVisible();
});
