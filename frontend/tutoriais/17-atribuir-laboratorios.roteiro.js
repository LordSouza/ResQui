import { test } from '@playwright/test';
import { entrar, gravar, clicar, pausa } from './gravador.js';
import { PROFESSOR, ALUNA, LABORATORIO_DOS_TUTORIAIS, definirLaboratoriosDoProfessor } from './preparacao.js';

const SEGUNDO_LABORATORIO = 'Química Analítica';

test('como atribuir laboratórios a um aluno', async ({ page, request }) => {
  await definirLaboratoriosDoProfessor(request, [LABORATORIO_DOS_TUTORIAIS, SEGUNDO_LABORATORIO]);
  await entrar(page, PROFESSOR);

  await gravar(page, '17-atribuir-laboratorios', async () => {
    await clicar(page, page.locator('.nav').getByRole('button', { name: 'Usuários' }).first());
    await pausa(page, 2000);

    const linhaDaAluna = page.getByRole('row').filter({ hasText: ALUNA.email });
    await clicar(page, linhaDaAluna.getByRole('button', { name: 'Opções do usuário' }));
    await pausa(page, 800);
    await clicar(page, linhaDaAluna.getByRole('button', { name: 'Laboratórios' }));
    await pausa(page, 1500);

    const formulario = page.getByRole('dialog', { name: 'Laboratórios' });
    await clicar(page, formulario.getByText(SEGUNDO_LABORATORIO, { exact: true }));
    await pausa(page, 1000);
    await clicar(page, formulario.getByRole('button', { name: 'Salvar' }));
    await pausa(page, 3000);
  });
});
