import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { TUTORIAL_DO_FORMULARIO, URL_DO_BLOG, urlDoTutorial } from '../../src/lib/tutoriais';

const PASTA_DE_POSTS = join(__dirname, '../../blog/posts');

describe('tutoriais do blog', () => {
  it.each(Object.entries(TUTORIAL_DO_FORMULARIO))('o formulário %s aponta para um post que existe (%s)', (_, slug) => {
    expect(existsSync(join(PASTA_DE_POSTS, `${slug}.md`))).toBe(true);
  });

  it('monta a URL do post com a barra final, como os links internos do blog', () => {
    expect(URL_DO_BLOG).toBe('/blog/');
    expect(urlDoTutorial('novoReagente')).toBe('/blog/cadastrar-reagente/');
  });
});
