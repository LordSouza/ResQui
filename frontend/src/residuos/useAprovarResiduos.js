import { useMutation, useQueryClient } from '@tanstack/react-query';
import { executarEmCadaResiduo } from './executarEmLote';

// RF06 — aprova solicitações de descarte (solicitado → aguardando-coleta). Requer a policy Aprovador.
export function useAprovarResiduos() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids) => executarEmCadaResiduo(ids, 'aprovar'),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['residuos'] }),
  });
}
