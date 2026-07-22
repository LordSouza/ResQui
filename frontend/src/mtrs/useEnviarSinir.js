import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export function useEnviarSinir() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const res = await apiFetch(`/api/mtrs/${id}/enviar-sinir`, { method: 'PUT' });
      return res.json();
    },
    onSuccess: (_, id) => queryClient.invalidateQueries({ queryKey: ['mtrs', id] }),
  });
}
