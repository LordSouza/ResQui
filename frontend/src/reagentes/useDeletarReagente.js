import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export function useDeletarReagente() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const res = await apiFetch(`/api/reagentes/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 404) throw new Error('Erro ao deletar reagente');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reagentes'] }),
  });
}
