import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export function useAtualizarStatusChamado() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }) => {
      const res = await apiFetch(`/api/chamados/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ Status: status }),
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chamados'] }),
  });
}
