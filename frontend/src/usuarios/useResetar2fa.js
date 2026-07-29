import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export function useResetar2fa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      await apiFetch(`/api/usuarios/${id}/2fa/reset`, { method: 'POST' });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['usuarios'] }),
  });
}
