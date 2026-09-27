import { test } from '@playwright/test';
import { entrar, gravar, clicar, digitar, moverAte, pausa } from './gravador.js';
import { PROFESSOR } from './preparacao.js';

test('como configurar os dados da instituição e gerar o relatório PGRS', async ({ page }) => {
  await entrar(page, PROFESSOR);

  await gravar(page, '15-configurar-pgrs-e-gerar-relatorio', async () => {
    await clicar(page, page.locator('.nav').getByRole('button', { name: 'Relatórios' }).first());
    await pausa(page, 1500);
    await clicar(page, page.getByRole('button', { name: 'Configurar PGRS' }));
    await pausa(page, 1500);

    const formulario = page.getByRole('dialog', { name: 'Configurar PGRS' });
    await digitar(page, formulario.getByLabel('Nome do responsável técnico'), PROFESSOR.nome);
    await digitar(page, formulario.getByLabel('Registro CRQ'), 'CRQ-04123456');
    await digitar(page, formulario.getByLabel('E-mail do responsável técnico'), PROFESSOR.email);
    await clicar(page, formulario.getByRole('button', { name: 'Salvar configuração' }));
    await pausa(page, 2000);

    const cartaoDoPgrs = page.locator('.card').filter({ hasText: 'PGRS Anual' }).first();
    await clicar(page, cartaoDoPgrs.getByRole('button', { name: 'Gerar' }));
    await pausa(page, 2500);
    await moverAte(page, page.getByRole('button', { name: 'Baixar' }).first());
    await pausa(page, 2500);
  });
});
