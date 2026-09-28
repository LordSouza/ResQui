import { copyFileSync, mkdirSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const PASTA_DA_GRAVACAO = new URL('../tutoriais/saida/', import.meta.url).pathname;
const PASTA_DE_VIDEOS = new URL('./public/videos/', import.meta.url).pathname;
const PASTA_DE_CAPAS = new URL('./public/capas/', import.meta.url).pathname;

function duracaoEmSegundos(arquivoMp4) {
  const saida = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', arquivoMp4]);
  return Number(String(saida).trim());
}

function gerarCapa(arquivoMp4, arquivoJpg) {
  const instanteDaCapa = (duracaoEmSegundos(arquivoMp4) * 0.6).toFixed(2);
  execFileSync('ffmpeg', [
    '-v', 'error', '-y', '-ss', instanteDaCapa, '-i', arquivoMp4,
    '-frames:v', '1', '-vf', 'scale=960:-2', '-q:v', '4', arquivoJpg,
  ]);
}

mkdirSync(PASTA_DE_VIDEOS, { recursive: true });
mkdirSync(PASTA_DE_CAPAS, { recursive: true });

const videosGravados = readdirSync(PASTA_DA_GRAVACAO).filter(arquivo => arquivo.endsWith('.mp4'));
if (videosGravados.length === 0) {
  throw new Error(`Nenhum vídeo em ${PASTA_DA_GRAVACAO}. Rode "npm run tutoriais" na pasta frontend antes.`);
}

for (const video of videosGravados) {
  const destino = join(PASTA_DE_VIDEOS, video);
  copyFileSync(join(PASTA_DA_GRAVACAO, video), destino);
  gerarCapa(destino, join(PASTA_DE_CAPAS, video.replace(/\.mp4$/, '.jpg')));
  console.log(`${video} copiado, com capa`);
}
