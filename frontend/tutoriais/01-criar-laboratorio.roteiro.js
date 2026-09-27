import { test } from '@playwright/test';
import { entrar, gravar, clicar, digitar, pausa } from './gravador.js';
import { PROFESSOR, LABORATORIO_DOS_TUTORIAIS, garantirProfessor } from './preparacao.js';

test('como criar um laboratório', async ({ page, request }) => {
  await garantirProfessor(request);
  await entrar(page, PROFESSOR);

  await gravar(page, '01-criar-laboratorio', async () => {
    await clicar(page, page.locator('.nav').getByRole('button', { name: 'Laboratórios' }).first());
    await pausa(page, 1500);
    await clicar(page, page.getByRole('button', { name: 'Novo laboratório' }));
    await pausa(page, 1000);

    await digitar(page, page.getByLabel('Nome / área de atuação *'), LABORATORIO_DOS_TUTORIAIS);
    await digitar(page, page.getByLabel('Localização *'), 'Bloco B · Sala 105');
    await digitar(page, page.getByRole('textbox', { name: 'Armários' }), 'Armário de ácidos');
    await clicar(page, page.getByRole('button', { name: 'Adicionar' }));
    await digitar(page, page.getByRole('textbox', { name: 'Armários' }), 'Armário de solventes');
    await clicar(page, page.getByRole('button', { name: 'Adicionar' }));
    await pausa(page, 1000);

    await clicar(page, page.getByRole('button', { name: 'Cadastrar laboratório' }));
    await pausa(page, 1500);
    const cartaoNovo = page.getByText(LABORATORIO_DOS_TUTORIAIS, { exact: true }).first();
    await cartaoNovo.scrollIntoViewIfNeeded();
    const caixa = await cartaoNovo.boundingBox();
    await page.mouse.move(caixa.x + caixa.width / 2, caixa.y + caixa.height / 2, { steps: 25 });
  });
});
