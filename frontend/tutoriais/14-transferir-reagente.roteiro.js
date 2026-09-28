import { test } from '@playwright/test';
import { entrar, gravar, clicar, digitar, escolher, pausa } from './gravador.js';
import { ALUNA, LABORATORIO_DOS_TUTORIAIS } from './preparacao.js';

test('como transferir um reagente de armário', async ({ page }) => {
  await entrar(page, ALUNA);

  await gravar(page, '14-transferir-reagente', async () => {
    await clicar(page, page.locator('.nav').getByRole('button', { name: 'Inventário' }).first());
    await pausa(page, 1500);
    await digitar(page, page.getByLabel('Buscar reagentes'), 'Etanol');
    await pausa(page, 1200);
    await clicar(page, page.getByRole('cell', { name: 'Etanol absoluto' }).first());
    await pausa(page, 2000);

    await clicar(page, page.getByRole('button', { name: 'Transferir' }));
    await pausa(page, 1000);
    const formulario = page.getByRole('dialog', { name: 'Transferir reagente' });
    await escolher(page, formulario.getByLabel('Laboratório', { exact: true }), LABORATORIO_DOS_TUTORIAIS);
    await escolher(page, formulario.getByLabel('Armário', { exact: true }), 'Armário de solventes');
    await pausa(page, 800);
    await clicar(page, formulario.getByRole('button', { name: 'Confirmar transferência' }));
    await pausa(page, 3000);
  });
});
