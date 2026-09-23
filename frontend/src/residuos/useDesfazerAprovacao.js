import { useMutation, useQueryClient } from '@tanstack/react-query';
import { executarEmCadaResiduo } from './executarEmLote';

export function useDesfazerAprovacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids) => executarEmCadaResiduo(ids, 'desfazer-aprovacao'),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['residuos'] }),
  });
}
