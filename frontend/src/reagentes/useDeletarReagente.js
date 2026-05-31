import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export function useDeletarReagente() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      try {
        await apiFetch(`/api/reagentes/${id}`, { method: 'DELETE' });
      } catch (err) {
        if (err.status !== 404) throw err;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reagentes'] }),
  });
}
