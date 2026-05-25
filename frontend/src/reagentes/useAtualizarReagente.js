import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export function useAtualizarReagente() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...cmd }) => {
      const res = await apiFetch(`/api/reagentes/${id}`, { method: 'PUT', body: JSON.stringify(cmd) });
      if (!res.ok) throw new Error('Erro ao atualizar reagente');
      return res.json();
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['reagentes'] });
      queryClient.invalidateQueries({ queryKey: ['reagentes', id] });
    },
  });
}
