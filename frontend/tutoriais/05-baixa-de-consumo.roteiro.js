import { test } from '@playwright/test';
import { entrar, gravar, clicar, digitar, escolher, pausa } from './gravador.js';
import { ALUNA, trazerReagentesDemoParaOLaboratorio } from './preparacao.js';

test('como registrar o consumo de um reagente', async ({ page, request }) => {
  await trazerReagentesDemoParaOLaboratorio(request);
  await entrar(page, ALUNA);

  await gravar(page, '05-baixa-de-consumo', async () => {
    await clicar(page, page.locator('.nav').getByRole('button', { name: 'Inventário' }).first());
    await pausa(page, 1500);
    await digitar(page, page.getByLabel('Buscar reagentes'), 'Acetona');
    await pausa(page, 1200);
    await clicar(page, page.getByRole('cell', { name: 'Acetona P.A.' }).first());
    await pausa(page, 2000);

    await clicar(page, page.getByRole('button', { name: 'Baixar consumo' }));
    await pausa(page, 1000);
    const formulario = page.getByRole('dialog', { name: 'Baixa de consumo' });
    await digitar(page, formulario.getByLabel('Quantidade a dar baixa'), '0.5');
    await escolher(page, formulario.getByLabel('Motivo / finalidade'), 'Pesquisa / experimento');
    await pausa(page, 800);
    await clicar(page, formulario.getByRole('button', { name: 'Confirmar baixa' }));
    await pausa(page, 1500);

    const movimentacao = page.getByText('motivo: Pesquisa / experimento');
    await movimentacao.waitFor();
    const caixa = await movimentacao.boundingBox();
    await page.mouse.move(caixa.x + caixa.width / 2, caixa.y + caixa.height / 2, { steps: 25 });
    await pausa(page, 2000);
  });
});
