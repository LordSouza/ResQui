import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { marked } from 'marked';

const BASE = '/blog/';
const PASTA_DO_BLOG = new URL('./', import.meta.url).pathname;
const PASTA_DE_POSTS = join(PASTA_DO_BLOG, 'posts');
const PASTA_PUBLICA = join(PASTA_DO_BLOG, 'public');
const PASTA_DE_SAIDA = join(PASTA_DO_BLOG, 'dist');

const SECOES = [
  { id: 'primeiros-passos', titulo: 'Primeiros passos', descricao: 'Montar o laboratório, trazer a equipe e proteger a conta.' },
  { id: 'inventario', titulo: 'Inventário no dia a dia', descricao: 'Cadastrar, consumir, mover e consultar reagentes.' },
  { id: 'residuos', titulo: 'Ciclo do resíduo', descricao: 'Do registro do descarte à destinação final.' },
  { id: 'gestao', titulo: 'Gestão', descricao: 'Documentos institucionais e rastreabilidade.' },
];

const CAMPOS_OBRIGATORIOS = ['titulo', 'resumo', 'secao', 'ordem', 'quem', 'video'];

function separarCabecalho(conteudo, arquivo) {
  const encontrado = conteudo.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!encontrado) throw new Error(`${arquivo}: falta o cabeçalho entre linhas "---".`);
  const campos = Object.fromEntries(encontrado[1].split('\n').map(linha => {
    const separador = linha.indexOf(':');
    return [linha.slice(0, separador).trim(), linha.slice(separador + 1).trim()];
  }));
  return { campos, corpo: encontrado[2] };
}

function lerPost(arquivo) {
  const { campos, corpo } = separarCabecalho(readFileSync(join(PASTA_DE_POSTS, arquivo), 'utf8'), arquivo);
  const ausentes = CAMPOS_OBRIGATORIOS.filter(campo => !campos[campo]);
  if (ausentes.length > 0) throw new Error(`${arquivo}: faltam os campos ${ausentes.join(', ')}.`);
  if (!SECOES.some(secao => secao.id === campos.secao)) throw new Error(`${arquivo}: seção desconhecida "${campos.secao}".`);
  if (!existsSync(join(PASTA_PUBLICA, 'videos', campos.video))) throw new Error(`${arquivo}: vídeo ${campos.video} não existe em public/videos. Rode "npm run videos".`);
  return {
    ...campos,
    ordem: Number(campos.ordem),
    slug: arquivo.replace(/\.md$/, ''),
    capa: campos.video.replace(/\.mp4$/, '.jpg'),
    html: marked.parse(corpo),
  };
}

function escapar(texto) {
  return texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function pagina({ titulo, descricao, conteudo }) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapar(titulo)}</title>
  <meta name="description" content="${escapar(descricao)}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="${BASE}estilo.css">
</head>
<body>
  <header class="topo">
    <a class="marca" href="${BASE}"><span class="logo">Rq</span><span>ResQui <span class="marca-sub">Tutoriais</span></span></a>
    <a class="abrir-sistema" href="/">Abrir o ResQui</a>
  </header>
  <main>
${conteudo}
  </main>
  <footer class="rodape">ResQui · gestão de resíduos químicos de laboratório</footer>
</body>
</html>
`;
}

function cartaoDoPost(post) {
  return `        <a class="cartao" href="${BASE}${post.slug}/">
          <img src="${BASE}capas/${post.capa}" alt="" loading="lazy" width="960" height="540">
          <span class="cartao-titulo">${escapar(post.titulo)}</span>
          <span class="cartao-resumo">${escapar(post.resumo)}</span>
          <span class="cartao-quem">${escapar(post.quem)}</span>
        </a>`;
}

function paginaInicial(postsPorSecao) {
  const secoes = SECOES.map(secao => `    <section class="secao" id="${secao.id}">
      <h2>${secao.titulo}</h2>
      <p class="secao-descricao">${secao.descricao}</p>
      <div class="grade">
${postsPorSecao.get(secao.id).map(cartaoDoPost).join('\n')}
      </div>
    </section>`).join('\n');
  return pagina({
    titulo: 'Tutoriais do ResQui',
    descricao: 'Vídeos curtos e passo a passo para usar o ResQui no laboratório.',
    conteudo: `    <div class="abertura">
      <h1>Tutoriais do ResQui</h1>
      <p>Vídeos curtos, com o passo a passo de cada tarefa do sistema. Cada tutorial diz quem pode fazer aquilo — professor, aluno ou os dois.</p>
    </div>
${secoes}`,
  });
}

function linkDeNavegacao(post, rotulo, classe) {
  if (!post) return '<span></span>';
  return `<a class="${classe}" href="${BASE}${post.slug}/"><span class="navegacao-rotulo">${rotulo}</span>${escapar(post.titulo)}</a>`;
}

function paginaDoPost(post, anterior, proximo) {
  const secao = SECOES.find(item => item.id === post.secao);
  return pagina({
    titulo: `${post.titulo} · Tutoriais do ResQui`,
    descricao: post.resumo,
    conteudo: `    <article class="post">
      <nav class="trilha"><a href="${BASE}">Tutoriais</a> › <a href="${BASE}#${secao.id}">${secao.titulo}</a></nav>
      <h1>${escapar(post.titulo)}</h1>
      <p class="resumo">${escapar(post.resumo)}</p>
      <p class="quem"><strong>Quem pode:</strong> ${escapar(post.quem)}</p>
      <video controls preload="metadata" playsinline poster="${BASE}capas/${post.capa}" width="1920" height="1080">
        <source src="${BASE}videos/${post.video}" type="video/mp4">
      </video>
${post.html}
      <nav class="navegacao">
        ${linkDeNavegacao(anterior, 'Anterior', 'navegacao-anterior')}
        ${linkDeNavegacao(proximo, 'Próximo', 'navegacao-proximo')}
      </nav>
    </article>`,
  });
}

const posts = readdirSync(PASTA_DE_POSTS).filter(arquivo => arquivo.endsWith('.md')).map(lerPost);
const postsPorSecao = new Map(SECOES.map(secao => [
  secao.id,
  posts.filter(post => post.secao === secao.id).sort((a, b) => a.ordem - b.ordem),
]));
const postsEmOrdem = SECOES.flatMap(secao => postsPorSecao.get(secao.id));

rmSync(PASTA_DE_SAIDA, { recursive: true, force: true });
mkdirSync(PASTA_DE_SAIDA, { recursive: true });
cpSync(PASTA_PUBLICA, PASTA_DE_SAIDA, { recursive: true });
cpSync(join(PASTA_DO_BLOG, 'estilo.css'), join(PASTA_DE_SAIDA, 'estilo.css'));
writeFileSync(join(PASTA_DE_SAIDA, 'index.html'), paginaInicial(postsPorSecao));
postsEmOrdem.forEach((post, indice) => {
  mkdirSync(join(PASTA_DE_SAIDA, post.slug), { recursive: true });
  writeFileSync(join(PASTA_DE_SAIDA, post.slug, 'index.html'),
    paginaDoPost(post, postsEmOrdem[indice - 1], postsEmOrdem[indice + 1]));
});
console.log(`${posts.length} tutoriais gerados em ${PASTA_DE_SAIDA}`);
