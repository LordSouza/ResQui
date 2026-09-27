import { test } from '@playwright/test';
import { entrar, gravar, clicar, pausa } from './gravador.js';
import { PROFESSOR, numeroDoManifestoDoResiduo } from './preparacao.js';

test('como emitir um manifesto de coleta', async ({ page, request }) => {
  await entrar(page, PROFESSOR);

  await gravar(page, '09-emitir-manifesto', async () => {
    await clicar(page, page.locator('.nav').getByRole('button', { name: 'Manifestos' }).first());
    await pausa(page, 1500);
    await clicar(page, page.getByRole('button', { name: 'Novo manifesto' }));
    await pausa(page, 1500);

    const formulario = page.getByRole('dialog', { name: 'Novo manifesto' });
    await clicar(page, formulario.getByRole('checkbox').first());
    await pausa(page, 2000);
    await clicar(page, formulario.getByRole('button', { name: /^Emitir manifesto/ }));
    await pausa(page, 2500);

    const numeroDoManifesto = await numeroDoManifestoDoResiduo(request, 'Acetona e etanol da lavagem de vidraria');
    await clicar(page, page.getByRole('row').filter({ hasText: numeroDoManifesto }));
    await pausa(page, 1500);
    await clicar(page, page.getByRole('button', { name: 'Pré-visualizar' }));
    await pausa(page, 2000);
    const previa = page.getByRole('dialog', { name: /^Pré-visualização/ });
    await previa.locator('.modal-body').evaluate(corpo => corpo.scrollBy({ top: 400, behavior: 'smooth' }));
    await pausa(page, 3000);
    await clicar(page, previa.getByRole('button', { name: 'Fechar', exact: true }));
    await pausa(page, 1500);
  });
});
