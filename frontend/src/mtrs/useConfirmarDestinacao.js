import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export function useConfirmarDestinacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }) => {
      const res = await apiFetch(`/api/mtrs/${id}/destinacao`, {
        method: 'POST',
        body: JSON.stringify({ Data: data }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mtrs'] });
      queryClient.invalidateQueries({ queryKey: ['residuos'] });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['mtrs'] });
      queryClient.invalidateQueries({ queryKey: ['residuos'] });
    },
  });
}
