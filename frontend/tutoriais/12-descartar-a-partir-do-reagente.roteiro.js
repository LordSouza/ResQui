import { test } from '@playwright/test';
import { entrar, gravar, clicar, digitar, pausa } from './gravador.js';
import { ALUNA, trazerReagentesDemoParaOLaboratorio } from './preparacao.js';

test('como descartar um reagente a partir da ficha', async ({ page, request }) => {
  await trazerReagentesDemoParaOLaboratorio(request);
  await entrar(page, ALUNA);

  await gravar(page, '12-descartar-a-partir-do-reagente', async () => {
    await clicar(page, page.locator('.nav').getByRole('button', { name: 'Inventário' }).first());
    await pausa(page, 1500);
    await digitar(page, page.getByLabel('Buscar reagentes'), 'Tolueno');
    await pausa(page, 1200);
    await clicar(page, page.getByRole('cell', { name: 'Tolueno P.A.' }).first());
    await pausa(page, 2000);

    await clicar(page, page.getByRole('button', { name: 'Descartar como resíduo' }));
    await pausa(page, 2500);
    const formulario = page.getByRole('dialog', { name: 'Registrar resíduo' });
    await digitar(page, formulario.getByRole('spinbutton', { name: 'Volume' }), '0.5');
    await pausa(page, 1000);
    await clicar(page, formulario.getByRole('button', { name: 'Registrar resíduo' }));
    await pausa(page, 1500);

    await clicar(page, page.locator('.nav').getByRole('button', { name: /^Resíduos/ }).first());
    await pausa(page, 3000);
  });
});
