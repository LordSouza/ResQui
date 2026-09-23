export const NIVEL_BLOQUEIO_MISTURA = 2;

export const ROTULO_NIVEL = ['Compatível', 'Cautela', 'Perigo', 'Proibido'];

function nivelDoPar(matrix, classeA, classeB) {
  return Math.max(matrix[classeA]?.[classeB - 1] ?? 0, matrix[classeB]?.[classeA - 1] ?? 0);
}

export function piorParDaMistura(classes, matrix) {
  const distintas = [...new Set(classes)].sort((a, b) => a - b);
  let pior = null;
  for (let i = 0; i < distintas.length; i++) {
    for (let j = i + 1; j < distintas.length; j++) {
      const nivel = nivelDoPar(matrix, distintas[i], distintas[j]);
      if (pior === null || nivel > pior.nivel) pior = { classeA: distintas[i], classeB: distintas[j], nivel };
    }
  }
  return pior;
}

export function piorNivelContra(classe, selecionadas, matrix) {
  return selecionadas
    .filter(outra => outra !== classe)
    .reduce((pior, outra) => Math.max(pior, nivelDoPar(matrix, classe, outra)), 0);
}

export function mesmoConjunto(classesA, classesB) {
  const conjuntoA = new Set(classesA);
  const conjuntoB = new Set(classesB);
  return conjuntoA.size === conjuntoB.size && [...conjuntoA].every(c => conjuntoB.has(c));
}
