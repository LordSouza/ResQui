import { test } from '@playwright/test';
import { entrar, gravar, clicar, moverAte, pausa } from './gravador.js';
import { PROFESSOR } from './preparacao.js';

test('como gerar o relatório PGRS', async ({ page }) => {
  await entrar(page, PROFESSOR);

  await gravar(page, '15-configurar-pgrs-e-gerar-relatorio', async () => {
    await clicar(page, page.locator('.nav').getByRole('button', { name: 'Relatórios' }).first());
    await pausa(page, 1500);
    const cartaoDoPgrs = page.locator('.card').filter({ hasText: 'PGRS Anual' }).first();
    await clicar(page, cartaoDoPgrs.getByRole('button', { name: 'Gerar' }));
    await pausa(page, 2500);
    await moverAte(page, page.getByRole('button', { name: 'Baixar' }).first());
    await pausa(page, 2500);
  });
});
