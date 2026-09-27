import { test } from '@playwright/test';
import { entrar, gravar, clicar, digitar, moverAte, pausa } from './gravador.js';
import { PROFESSOR } from './preparacao.js';

test('como registrar um frasco (lote) de um reagente', async ({ page }) => {
  await entrar(page, PROFESSOR);

  await gravar(page, '13-registrar-lote', async () => {
    await clicar(page, page.locator('.nav').getByRole('button', { name: 'Inventário' }).first());
    await pausa(page, 1500);
    await digitar(page, page.getByLabel('Buscar reagentes'), 'acético');
    await pausa(page, 1200);
    await clicar(page, page.getByRole('cell', { name: /Ácido acético glacial/ }).first());
    await pausa(page, 2000);

    await clicar(page, page.getByRole('button', { name: 'Novo lote' }));
    await pausa(page, 800);
    await digitar(page, page.getByLabel('Código do lote'), 'L-2026-01');
    await digitar(page, page.getByLabel('Estoque do lote'), '1');
    await clicar(page, page.getByLabel('Validade do lote'));
    await page.getByLabel('Validade do lote').fill('2028-06-30');
    await pausa(page, 800);
    await clicar(page, page.getByRole('button', { name: 'Salvar', exact: true }));
    await pausa(page, 2000);

    await moverAte(page, page.getByText('L-2026-01').first());
    await pausa(page, 1500);
    await moverAte(page, page.getByRole('button', { name: 'Imprimir rótulo' }));
    await pausa(page, 2500);
  });
});
