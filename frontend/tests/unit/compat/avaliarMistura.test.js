import { describe, it, expect } from 'vitest';
import { piorParDaMistura, piorNivelContra, mesmoConjunto } from '../../../src/compat/avaliarMistura';

const matrix = { 1: [0, 1, 3], 2: [1, 0, 2], 3: [3, 2, 0] };

describe('piorParDaMistura', () => {
  it('devolve null com menos de duas classes distintas', () => {
    expect(piorParDaMistura([], matrix)).toBeNull();
    expect(piorParDaMistura([2, 2], matrix)).toBeNull();
  });

  it('devolve o par de maior nível, em ordem crescente', () => {
    expect(piorParDaMistura([3, 2, 1], matrix)).toEqual({ classeA: 1, classeB: 3, nivel: 3 });
  });

  it('considera o nível espelhado quando só um sentido está na matriz', () => {
    expect(piorParDaMistura([1, 4], { 4: [2] })).toEqual({ classeA: 1, classeB: 4, nivel: 2 });
  });

  it('trata par ausente da matriz como compatível', () => {
    expect(piorParDaMistura([7, 8], matrix)).toEqual({ classeA: 7, classeB: 8, nivel: 0 });
  });
});

describe('piorNivelContra', () => {
  it('devolve o pior nível da classe contra as já marcadas, ignorando ela mesma', () => {
    expect(piorNivelContra(3, [1, 2, 3], matrix)).toBe(3);
    expect(piorNivelContra(2, [1], matrix)).toBe(1);
    expect(piorNivelContra(1, [], matrix)).toBe(0);
  });
});

describe('mesmoConjunto', () => {
  it('ignora ordem e duplicatas', () => {
    expect(mesmoConjunto([1, 3, 3], [3, 1])).toBe(true);
    expect(mesmoConjunto([1, 3], [1, 2])).toBe(false);
    expect(mesmoConjunto([1], [1, 2])).toBe(false);
  });
});
