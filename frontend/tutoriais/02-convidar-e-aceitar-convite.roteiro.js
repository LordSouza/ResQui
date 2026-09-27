import { test } from '@playwright/test';
import { entrar, mostrarCursor, gravar, clicar, digitar, pausa } from './gravador.js';
import { PROFESSOR, ALUNA, LABORATORIO_DOS_TUTORIAIS, garantirProfessor, removerUsuarioSeExistir } from './preparacao.js';

test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

test('como convidar um aluno e como aceitar o convite', async ({ page, browser, request }) => {
  await garantirProfessor(request);
  await removerUsuarioSeExistir(request, ALUNA.email);
  await entrar(page, PROFESSOR);
  let linkDoConvite = '';

  await gravar(page, '02-convidar-aluno', async () => {
    await clicar(page, page.locator('.nav').getByRole('button', { name: 'Usuários' }).first());
    await pausa(page, 1500);
    await clicar(page, page.getByRole('button', { name: 'Convidar por link' }));
    await pausa(page, 1000);

    const formulario = page.getByRole('dialog', { name: 'Convidar por link' });
    await clicar(page, formulario.getByText(LABORATORIO_DOS_TUTORIAIS, { exact: true }));
    await pausa(page, 800);
    await clicar(page, formulario.getByRole('button', { name: 'Gerar link' }));
    await pausa(page, 2000);

    linkDoConvite = await formulario.locator('.hint-card .mono').innerText();
    await clicar(page, formulario.getByRole('button', { name: 'Copiar link' }));
    await pausa(page, 2500);
  });

  const contextoDaAluna = await browser.newContext();
  const paginaDaAluna = await contextoDaAluna.newPage();
  await mostrarCursor(paginaDaAluna);
  await paginaDaAluna.goto(linkDoConvite);
  await paginaDaAluna.getByRole('heading', { name: 'Criar sua conta' }).waitFor();
  await paginaDaAluna.mouse.move(640, 360);
  await pausa(paginaDaAluna, 1000);

  await gravar(paginaDaAluna, '03-aceitar-convite', async () => {
    await pausa(paginaDaAluna, 1500);
    await digitar(paginaDaAluna, paginaDaAluna.getByLabel('Nome completo'), ALUNA.nome);
    await digitar(paginaDaAluna, paginaDaAluna.getByLabel('E-mail institucional'), ALUNA.email);
    await digitar(paginaDaAluna, paginaDaAluna.getByLabel('Matrícula'), ALUNA.matricula);
    await digitar(paginaDaAluna, paginaDaAluna.getByLabel('Senha', { exact: true }), ALUNA.senha);
    await digitar(paginaDaAluna, paginaDaAluna.getByLabel('Confirmar senha'), ALUNA.senha);
    await clicar(paginaDaAluna, paginaDaAluna.getByRole('button', { name: 'Criar conta e entrar' }));
    await paginaDaAluna.getByRole('heading', { name: 'Início' }).waitFor();
    await pausa(paginaDaAluna, 3000);
  });

  await contextoDaAluna.close();
});
