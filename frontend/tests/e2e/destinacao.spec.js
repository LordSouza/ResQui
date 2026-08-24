import { test, expect } from '@playwright/test';
import { apiAuth, criarResiduoAguardandoColeta } from './seed';

async function login(page) {
  await page.goto('/');
  await page.getByLabel('Senha', { exact: true }).fill('Admin@123');
  await page.getByRole('button', { name: /Entrar/ }).click();
  await page.getByRole('button', { name: 'Início' }).waitFor({ timeout: 2000 });
}

// Ciclo inteiro: resíduo aprovado → manifesto → destinação confirmada pela UI → some de "Em coleta"
// e aparece em "Destinados".
test('confirmar destinação encerra o resíduo do manifesto', async ({ page, request }) => {
  const auth = await apiAuth(request);
  const residuo = await criarResiduoAguardandoColeta(request, auth);
  const mtrRes = await request.post('/api/mtrs', {
    headers: auth,
    data: {
      Gerador: 'Unifei', Transportadora: 'EcoLog', Destinador: 'EcoQuímica SA',
      CodigoIbama: 'A099', ResiduoIds: [residuo.id],
    },
  });
  const mtr = await mtrRes.json();

  await login(page);
  await page.getByRole('complementary').getByRole('button', { name: /Manifestos/ }).click();
  await page.getByText(mtr.numero).first().click();
  await page.getByRole('button', { name: /Confirmar destinação/ }).click();
  await expect(page.locator('.modal-title', { hasText: 'Confirmar destinação' })).toBeVisible();
  await page.getByRole('button', { name: /^Confirmar$/ }).click();

  // O botão some porque o manifesto passou a ter data de destinação.
  await expect(page.getByRole('button', { name: /Confirmar destinação/ })).toHaveCount(0);

  // E o resíduo migrou de estado.
  const depois = await request.get(`/api/residuos?mtrId=${mtr.id}`, { headers: auth });
  const lista = await depois.json();
  expect(lista[0].status).toBe('destinado');

  const pdf = await request.get(`/api/mtrs/${mtr.id}/pdf`, { headers: auth });
  expect(pdf.status()).toBe(200);
  expect((await pdf.body()).byteLength).toBeGreaterThan(1000);

  // Reabrir devolve para "em-coleta".
  const reabrir = await request.delete(`/api/mtrs/${mtr.id}/destinacao`, { headers: auth });
  expect(reabrir.status()).toBe(204);
  const voltou = await (await request.get(`/api/residuos?mtrId=${mtr.id}`, { headers: auth })).json();
  expect(voltou[0].status).toBe('em-coleta');
});
