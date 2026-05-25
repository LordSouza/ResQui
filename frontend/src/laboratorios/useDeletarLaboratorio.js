import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export function useDeletarLaboratorio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const res = await apiFetch(`/api/laboratorios/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 404) throw new Error('Erro ao remover laboratório');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['laboratorios'] }),
  });
}
