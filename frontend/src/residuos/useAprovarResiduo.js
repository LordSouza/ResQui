import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

// RF06 — aprova a solicitação de descarte (move solicitado → aguardando-coleta). Requer Gestor+.
export function useAprovarResiduo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const res = await apiFetch(`/api/residuos/${id}/aprovar`, { method: 'PUT' });
      if (!res.ok) throw new Error('Erro ao aprovar descarte');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['residuos'] }),
  });
}
