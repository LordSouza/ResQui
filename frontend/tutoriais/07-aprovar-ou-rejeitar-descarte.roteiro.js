import { test } from '@playwright/test';
import { entrar, gravar, clicar, digitar, pausa } from './gravador.js';
import { PROFESSOR, registrarSolicitacaoDeDescarte } from './preparacao.js';

const COMPOSICAO_INCOMPLETA = 'Solvente usado';

test('como aprovar ou rejeitar um descarte', async ({ page, request }) => {
  await registrarSolicitacaoDeDescarte(request, COMPOSICAO_INCOMPLETA);
  await entrar(page, PROFESSOR);

  await gravar(page, '07-aprovar-ou-rejeitar-descarte', async () => {
    await clicar(page, page.locator('.nav').getByRole('button', { name: /^Resíduos/ }).first());
    await pausa(page, 1500);
    await clicar(page, page.getByRole('button', { name: /^Solicitado/ }));
    await pausa(page, 2000);

    const linhaParaAprovar = page.getByRole('row').filter({ hasText: 'Acetona e etanol da lavagem de vidraria' });
    await clicar(page, linhaParaAprovar.getByRole('button', { name: 'Aprovar' }));
    await pausa(page, 3000);

    const linhaParaRejeitar = page.getByRole('row').filter({ hasText: COMPOSICAO_INCOMPLETA });
    await clicar(page, linhaParaRejeitar.getByRole('button', { name: 'Rejeitar' }));
    await pausa(page, 1000);
    const formulario = page.getByRole('dialog', { name: 'Rejeitar descarte' });
    await digitar(page, formulario.getByLabel('Motivo *'), 'Composição incompleta: informe quais solventes e o percentual de cada um.');
    await clicar(page, formulario.getByRole('button', { name: 'Rejeitar descarte' }));
    await pausa(page, 1500);

    await clicar(page, page.getByRole('button', { name: /^Rejeitados/ }));
    await pausa(page, 2500);
  });
});
