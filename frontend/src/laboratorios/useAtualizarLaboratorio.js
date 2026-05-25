import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export function useAtualizarLaboratorio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...cmd }) => {
      const res = await apiFetch(`/api/laboratorios/${id}`, { method: 'PUT', body: JSON.stringify(cmd) });
      if (!res.ok) throw new Error('Erro ao atualizar laboratório');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['laboratorios'] }),
  });
}
