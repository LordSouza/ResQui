import { test } from '@playwright/test';
import { entrar, gravar, clicar, digitar, escolher, pausa } from './gravador.js';
import { PROFESSOR } from './preparacao.js';

test('como consultar a auditoria', async ({ page }) => {
  await entrar(page, PROFESSOR);

  await gravar(page, '16-consultar-auditoria', async () => {
    await clicar(page, page.locator('.nav').getByRole('button', { name: 'Auditoria' }).first());
    await pausa(page, 2500);

    await digitar(page, page.getByLabel('Buscar no log de auditoria'), 'mariana');
    await pausa(page, 2500);
    await escolher(page, page.getByLabel('Filtrar por ação'), 'reagente.baixa');
    await pausa(page, 3000);
  });
});
