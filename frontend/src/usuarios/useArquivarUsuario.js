import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export function useArquivarUsuario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      await apiFetch(`/api/usuarios/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['usuarios'] }),
  });
}
