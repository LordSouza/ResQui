import { test } from '@playwright/test';
import { entrar, gravar, clicar, pausa } from './gravador.js';
import { PROFESSOR, numeroDoManifestoDoResiduo } from './preparacao.js';

test('como confirmar a destinação de um manifesto', async ({ page, request }) => {
  const numeroDoManifesto = await numeroDoManifestoDoResiduo(request, 'Acetona e etanol da lavagem de vidraria');
  await entrar(page, PROFESSOR);

  await gravar(page, '10-confirmar-destinacao', async () => {
    await clicar(page, page.locator('.nav').getByRole('button', { name: 'Manifestos' }).first());
    await pausa(page, 2000);
    await clicar(page, page.getByRole('row').filter({ hasText: numeroDoManifesto }));
    await pausa(page, 1500);
    await clicar(page, page.getByRole('button', { name: 'Confirmar destinação' }));
    await pausa(page, 1500);

    const formulario = page.getByRole('dialog', { name: 'Confirmar destinação' });
    await clicar(page, formulario.getByLabel('Data da destinação'));
    await pausa(page, 1000);
    await clicar(page, formulario.getByRole('button', { name: 'Confirmar' }));
    await pausa(page, 2500);

    await clicar(page, page.locator('.nav').getByRole('button', { name: /^Resíduos/ }).first());
    await pausa(page, 1500);
    await clicar(page, page.getByRole('button', { name: /^Destinado/ }));
    await pausa(page, 3000);
  });
});
