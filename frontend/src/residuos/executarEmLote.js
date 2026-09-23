import { apiFetch } from '../lib/api';

export async function executarEmCadaResiduo(ids, acao) {
  const resultados = await Promise.allSettled(
    ids.map(id => apiFetch(`/api/residuos/${id}/${acao}`, { method: 'PUT' }))
  );
  const concluidos = [];
  const falhas = [];
  resultados.forEach((resultado, indice) => {
    if (resultado.status === 'fulfilled') concluidos.push(ids[indice]);
    else falhas.push({ id: ids[indice], mensagem: resultado.reason.message });
  });
  return { concluidos, falhas };
}
