import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const PASTA_SAIDA = new URL('./saida/', import.meta.url).pathname;

const CURSOR_VISIVEL = `
  window.addEventListener('DOMContentLoaded', () => {
    const cursor = document.createElement('div');
    cursor.style.cssText = 'position:fixed;z-index:2147483647;pointer-events:none;width:18px;height:18px;border-radius:50%;background:rgba(220,40,40,.55);border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.35);transform:translate(-50%,-50%);left:640px;top:360px;transition:transform .1s';
    document.body.appendChild(cursor);
    document.addEventListener('mousemove', e => { cursor.style.left = e.clientX + 'px'; cursor.style.top = e.clientY + 'px'; });
    document.addEventListener('mousedown', () => { cursor.style.transform = 'translate(-50%,-50%) scale(1.4)'; });
    document.addEventListener('mouseup', () => { cursor.style.transform = 'translate(-50%,-50%)'; });
  });
`;

export async function mostrarCursor(page) {
  await page.addInitScript(CURSOR_VISIVEL);
}

export async function entrar(page, { email, senha } = { email: 'admin@resqui.local', senha: 'Admin@123' }) {
  await mostrarCursor(page);
  await page.goto('/');
  await page.getByLabel('E-mail institucional').fill(email);
  await page.getByLabel('Senha').fill(senha);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.getByRole('heading', { name: 'Início' }).waitFor();
  await page.mouse.move(640, 360);
  await pausa(page, 1500);
}

export async function pausa(page, milissegundos) {
  await page.waitForTimeout(milissegundos);
}

export async function clicar(page, alvo) {
  await moverAte(page, alvo);
  await alvo.click();
  await pausa(page, 500);
}

export async function digitar(page, campo, texto) {
  await clicar(page, campo);
  await campo.fill('');
  await campo.pressSequentially(texto, { delay: 70 });
  await pausa(page, 500);
}

export async function escolher(page, campo, opcao) {
  await moverAte(page, campo);
  await page.mouse.down();
  await page.mouse.up();
  const rotuloProcurado = typeof opcao === 'string' ? opcao : opcao.label;
  await page.waitForFunction(
    ([select, rotulo]) => [...select.options].some(item => item.label === rotulo || item.value === rotulo),
    [await campo.elementHandle(), rotuloProcurado],
  );
  await campo.evaluate(abrirListaDeOpcoes, rotuloProcurado);
  await pausa(page, 700);

  const opcaoDesenhada = page.locator('[data-opcao-alvo]');
  await opcaoDesenhada.evaluate(item => item.scrollIntoView({ block: 'nearest' }));
  await moverAte(page, opcaoDesenhada);
  await pausa(page, 400);
  await page.mouse.down();
  await page.mouse.up();

  await page.evaluate(() => document.getElementById('lista-de-opcoes-tutorial')?.remove());
  await campo.selectOption(opcao);
  await pausa(page, 700);
}

async function moverAte(page, alvo) {
  await alvo.scrollIntoViewIfNeeded();
  const caixa = await alvo.boundingBox();
  await page.mouse.move(caixa.x + caixa.width / 2, caixa.y + caixa.height / 2, { steps: 25 });
  await pausa(page, 350);
}

function abrirListaDeOpcoes(select, rotuloProcurado) {
  const caixaDoCampo = select.getBoundingClientRect();
  const estiloDoCampo = getComputedStyle(select);
  const alturaDisponivelAbaixo = window.innerHeight - caixaDoCampo.bottom - 8;
  const alturaDisponivelAcima = caixaDoCampo.top - 8;
  const abreParaCima = alturaDisponivelAbaixo < 160 && alturaDisponivelAcima > alturaDisponivelAbaixo;
  const alturaMaxima = Math.min(280, abreParaCima ? alturaDisponivelAcima : alturaDisponivelAbaixo);

  const lista = document.createElement('div');
  lista.id = 'lista-de-opcoes-tutorial';
  lista.style.cssText = [
    'position:fixed', 'z-index:2147483646', 'overflow-y:auto', 'background:#fff',
    'border:1px solid #c4c9d2', 'border-radius:6px', 'box-shadow:0 8px 24px rgba(15,23,42,.18)',
    'padding:4px 0', `left:${caixaDoCampo.left}px`, `min-width:${caixaDoCampo.width}px`,
    `max-height:${alturaMaxima}px`, `font-family:${estiloDoCampo.fontFamily}`, `font-size:${estiloDoCampo.fontSize}`,
    abreParaCima ? `bottom:${window.innerHeight - caixaDoCampo.top + 2}px` : `top:${caixaDoCampo.bottom + 2}px`,
  ].join(';');

  const opcaoAtual = select.value;
  for (const opcao of select.options) {
    const item = document.createElement('div');
    item.textContent = opcao.label;
    const ehAlvo = opcao.label === rotuloProcurado || opcao.value === rotuloProcurado;
    if (ehAlvo) item.dataset.opcaoAlvo = '';
    const fundoEmRepouso = opcao.value === opcaoAtual ? '#eef2f7' : 'transparent';
    item.style.cssText = `padding:6px 12px;white-space:nowrap;color:#0f172a;background:${fundoEmRepouso}`;
    item.addEventListener('mouseenter', () => { item.style.background = '#1d4ed8'; item.style.color = '#fff'; });
    item.addEventListener('mouseleave', () => { item.style.background = fundoEmRepouso; item.style.color = '#0f172a'; });
    lista.appendChild(item);
  }
  document.body.appendChild(lista);
}

export async function gravar(page, nomeDoVideo, roteiro) {
  const pastaQuadros = join(PASTA_SAIDA, `.quadros-${nomeDoVideo}`);
  rmSync(pastaQuadros, { recursive: true, force: true });
  mkdirSync(pastaQuadros, { recursive: true });

  const quadros = [];
  let capturando = true;
  const sessao = await page.context().newCDPSession(page);
  sessao.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
    if (!capturando) return;
    const arquivo = join(pastaQuadros, `${String(quadros.length).padStart(6, '0')}.jpg`);
    writeFileSync(arquivo, Buffer.from(data, 'base64'));
    quadros.push({ arquivo, instante: metadata.timestamp });
    sessao.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  });
  await sessao.send('Page.startScreencast', { format: 'jpeg', quality: 95, everyNthFrame: 1 });

  await roteiro();
  await pausa(page, 2500);

  capturando = false;
  await sessao.send('Page.stopScreencast');
  const instanteFinal = Date.now() / 1000;
  codificarMp4(quadros, instanteFinal, pastaQuadros, join(PASTA_SAIDA, `${nomeDoVideo}.mp4`));
  rmSync(pastaQuadros, { recursive: true, force: true });
}

function codificarMp4(quadros, instanteFinal, pastaQuadros, arquivoMp4) {
  const linhasDaLista = quadros.flatMap((quadro, indice) => {
    const proximoInstante = quadros[indice + 1]?.instante ?? instanteFinal;
    const duracao = Math.max(proximoInstante - quadro.instante, 1 / 60);
    return [`file '${quadro.arquivo}'`, `duration ${duracao.toFixed(4)}`];
  });
  linhasDaLista.push(`file '${quadros.at(-1).arquivo}'`);
  const lista = join(pastaQuadros, 'lista.txt');
  writeFileSync(lista, linhasDaLista.join('\n'));

  execFileSync('ffmpeg', [
    '-v', 'error', '-y',
    '-f', 'concat', '-safe', '0', '-i', lista,
    '-vf', 'scale=1920:1080:flags=lanczos,fps=30,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '16',
    '-movflags', '+faststart',
    arquivoMp4,
  ]);
}

export async function opcaoQueComecaCom(campo, inicioDoRotulo) {
  await campo.locator('option', { hasText: inicioDoRotulo }).first().waitFor({ state: 'attached' });
  const rotulos = await campo.locator('option').allTextContents();
  return { label: rotulos.find(rotulo => rotulo.startsWith(inicioDoRotulo)) };
}
