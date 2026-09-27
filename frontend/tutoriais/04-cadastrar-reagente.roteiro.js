import { test } from '@playwright/test';
import { entrar, gravar, clicar, digitar, escolher, pausa } from './gravador.js';
import { PROFESSOR, LABORATORIO_DOS_TUTORIAIS } from './preparacao.js';

test('como cadastrar um reagente', async ({ page }) => {
  await entrar(page, PROFESSOR);

  await gravar(page, '04-cadastrar-reagente', async () => {
    await clicar(page, page.locator('.nav').getByRole('button', { name: 'Inventário' }).first());
    await pausa(page, 1500);
    await clicar(page, page.getByRole('button', { name: 'Novo reagente' }));
    await pausa(page, 1000);

    const formulario = page.getByRole('dialog', { name: 'Novo reagente' });
    await digitar(page, formulario.getByLabel('Nome do reagente'), 'Ácido acético glacial');
    await digitar(page, formulario.getByLabel('Número CAS do reagente'), '64-19-7');
    await digitar(page, formulario.getByLabel('Fórmula molecular do reagente'), 'C2H4O2');
    await digitar(page, formulario.getByLabel('Quantidade do estoque inicial'), '2.5');
    await clicar(page, formulario.getByLabel('Data de validade do reagente'));
    await formulario.getByLabel('Data de validade do reagente').fill('2027-12-31');
    await pausa(page, 700);
    await escolher(page, formulario.getByLabel('Localização'), `${LABORATORIO_DOS_TUTORIAIS} · Armário de ácidos`);
    await escolher(page, formulario.getByLabel('Classe de reatividade'), '2');

    await clicar(page, formulario.getByText('Classificação GHS (opcional)'));
    await escolher(page, formulario.getByLabel('Palavra-sinal'), 'Perigo');
    await clicar(page, formulario.getByRole('button', { name: /Inflamável/ }));
    await clicar(page, formulario.getByRole('button', { name: /Corrosivo/ }));
    await pausa(page, 1000);

    await clicar(page, formulario.getByRole('button', { name: 'Cadastrar reagente' }));
    await pausa(page, 1500);
    await digitar(page, page.getByLabel('Buscar reagentes'), 'acético');
    await pausa(page, 1500);
  });
});
