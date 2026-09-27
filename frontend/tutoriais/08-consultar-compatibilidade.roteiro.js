import { test } from '@playwright/test';
import { entrar, gravar, clicar, escolher, opcaoQueComecaCom, pausa } from './gravador.js';
import { ALUNA } from './preparacao.js';

test('como consultar a compatibilidade entre reagentes', async ({ page }) => {
  await entrar(page, ALUNA);

  await gravar(page, '08-consultar-compatibilidade', async () => {
    await clicar(page, page.locator('.nav').getByRole('button', { name: 'Compatibilidade' }).first());
    await pausa(page, 2000);

    const substanciaA = page.getByLabel('Substância A');
    const substanciaB = page.getByLabel('Substância B');
    await escolher(page, substanciaA, await opcaoQueComecaCom(substanciaA, 'Acetona P.A.'));
    await escolher(page, substanciaB, await opcaoQueComecaCom(substanciaB, 'Etanol absoluto'));
    await pausa(page, 2500);

    await escolher(page, substanciaB, await opcaoQueComecaCom(substanciaB, 'Peróxido de hidrogênio'));
    await pausa(page, 3500);
  });
});
