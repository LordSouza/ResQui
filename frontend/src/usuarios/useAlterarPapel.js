import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export function useAlterarPapel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, NovoPapel }) => {
      await apiFetch(`/api/usuarios/${id}/papel`, {
        method: 'PUT',
        body: JSON.stringify({ NovoPapel }),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['usuarios'] }),
  });
}
