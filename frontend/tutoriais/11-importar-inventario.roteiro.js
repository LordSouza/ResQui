import { test } from '@playwright/test';
import { entrar, gravar, clicar, escolher, moverAte, pausa } from './gravador.js';
import { PROFESSOR, LABORATORIO_DOS_TUTORIAIS } from './preparacao.js';

const PLANILHA_DE_EXEMPLO = new URL('./inventario-exemplo.xlsx', import.meta.url).pathname;

test('como importar o inventário por planilha', async ({ page }) => {
  await entrar(page, PROFESSOR);

  await gravar(page, '11-importar-inventario', async () => {
    await clicar(page, page.locator('.nav').getByRole('button', { name: 'Inventário' }).first());
    await pausa(page, 1500);
    await clicar(page, page.getByRole('button', { name: 'Importar Excel' }));
    await pausa(page, 1500);
    await escolher(page, page.getByLabel('Laboratório dos reagentes'), LABORATORIO_DOS_TUTORIAIS);

    const seletorDeArquivo = page.waitForEvent('filechooser');
    await clicar(page, page.getByRole('button', { name: 'Área para arrastar arquivo ou clique para selecionar' }));
    await (await seletorDeArquivo).setFiles(PLANILHA_DE_EXEMPLO);
    await pausa(page, 2000);

    const revisao = page.getByRole('dialog', { name: 'Revisar importação' });
    await moverAte(page, revisao.getByText('Classe de reatividade ausente').first());
    await pausa(page, 2500);
    await clicar(page, revisao.getByRole('button', { name: /^Importar \d+ reagentes/ }));
    await pausa(page, 2500);

    await clicar(page, page.getByRole('dialog', { name: 'Importação concluída' }).getByRole('button', { name: 'Ver inventário' }));
    await pausa(page, 2500);
  });
});
