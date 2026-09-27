import { test } from '@playwright/test';
import { totp } from '../tests/e2e/seed.js';
import { entrar, gravar, clicar, digitar, moverAte, pausa } from './gravador.js';
import { PROFESSOR } from './preparacao.js';

test('como ativar a verificação em duas etapas', async ({ page }) => {
  await entrar(page, PROFESSOR);

  await gravar(page, '18-ativar-2fa', async () => {
    await clicar(page, page.getByRole('button', { name: 'Conta e preferências' }));
    await pausa(page, 1000);
    await clicar(page, page.getByRole('button', { name: /Senha e 2FA/ }));
    await pausa(page, 1200);

    const formulario = page.getByRole('dialog', { name: 'Senha e autenticação' });
    await clicar(page, formulario.getByRole('button', { name: 'Autenticação em dois fatores' }));
    await pausa(page, 1000);
    await digitar(page, formulario.getByLabel('Senha atual para ativar o 2FA'), PROFESSOR.senha);
    await clicar(page, formulario.getByRole('button', { name: 'Ativar 2FA' }));
    await pausa(page, 2500);

    const chave = (await formulario.getByText('Sem câmera?').locator('xpath=following-sibling::div').innerText()).trim();
    await moverAte(page, formulario.getByAltText('QR code de configuração do autenticador'));
    await pausa(page, 2500);
    await digitar(page, formulario.getByLabel('Código de verificação'), totp(chave));
    await clicar(page, formulario.getByRole('button', { name: 'Confirmar' }));
    await pausa(page, 2500);

    await moverAte(page, formulario.getByRole('button', { name: 'Baixar .txt' }));
    await pausa(page, 3000);
  });
});
