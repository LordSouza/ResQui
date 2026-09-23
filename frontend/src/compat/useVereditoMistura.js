import { useCompatMatriz } from './useCompatMatriz';
import { NIVEL_BLOQUEIO_MISTURA, piorParDaMistura, mesmoConjunto } from './avaliarMistura';

export function useVereditoMistura(classes, classesGravadas = null) {
  const { data, isPending, isError } = useCompatMatriz();
  const matrix = data?.matrix ?? null;
  const pior = matrix ? piorParDaMistura(classes, matrix) : null;
  const perigoso = (pior?.nivel ?? 0) >= NIVEL_BLOQUEIO_MISTURA;
  const classificacaoPreservada = classesGravadas !== null && mesmoConjunto(classes, classesGravadas);
  return {
    matrix,
    pior,
    consultando: isPending,
    indisponivel: isError,
    perigoso,
    bloqueia: perigoso && !classificacaoPreservada,
  };
}
