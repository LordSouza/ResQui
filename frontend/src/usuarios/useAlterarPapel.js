import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export function useAlterarPapel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, NovoPapel }) => {
      const res = await apiFetch(`/api/usuarios/${id}/papel`, {
        method: 'PUT',
        body: JSON.stringify({ NovoPapel }),
      });
      if (!res.ok) throw new Error('Erro ao alterar papel');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['usuarios'] }),
  });
}
