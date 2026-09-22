import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

// RF06 — aprova a solicitação de descarte (move solicitado → aguardando-coleta). Requer a policy Aprovador.
export function useAprovarResiduo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const res = await apiFetch(`/api/residuos/${id}/aprovar`, { method: 'PUT' });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['residuos'] }),
  });
}
