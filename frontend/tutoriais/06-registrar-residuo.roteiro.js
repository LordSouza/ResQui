import { test } from '@playwright/test';
import { entrar, gravar, clicar, digitar, escolher, pausa } from './gravador.js';
import { ALUNA } from './preparacao.js';

test('como registrar um resíduo', async ({ page }) => {
  await entrar(page, ALUNA);

  await gravar(page, '06-registrar-residuo', async () => {
    await clicar(page, page.locator('.nav').getByRole('button', { name: /^Resíduos/ }).first());
    await pausa(page, 1500);
    await clicar(page, page.getByRole('button', { name: 'Registrar resíduo' }));
    await pausa(page, 1000);

    const formulario = page.getByRole('dialog', { name: 'Registrar resíduo' });
    await escolher(page, formulario.getByLabel('Tipo de resíduo *'), 'Solventes orgânicos não-halogenados');
    await digitar(page, formulario.getByRole('spinbutton', { name: 'Volume' }), '2');
    await digitar(page, formulario.getByLabel('Composição declarada *'), 'Acetona e etanol da lavagem de vidraria');

    await clicar(page, formulario.getByText('4. Oxidantes fortes', { exact: true }));
    await pausa(page, 3000);
    await clicar(page, formulario.getByText('4. Oxidantes fortes', { exact: true }));
    await pausa(page, 1500);

    await clicar(page, formulario.getByRole('button', { name: 'Registrar resíduo' }));
    await pausa(page, 2500);
  });
});
