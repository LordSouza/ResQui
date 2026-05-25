import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export function useAtualizarResiduo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...cmd }) => {
      const res = await apiFetch(`/api/residuos/${id}`, { method: 'PUT', body: JSON.stringify(cmd) });
      if (!res.ok) throw new Error('Erro ao atualizar resíduo');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['residuos'] }),
  });
}
