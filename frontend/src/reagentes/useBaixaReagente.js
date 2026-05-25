import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export function useBaixaReagente(id) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ quantidade }) => {
      const res = await apiFetch(`/api/reagentes/${id}/baixa`, {
        method: 'POST',
        body: JSON.stringify({ Quantidade: quantidade }),
      });
      if (!res.ok) throw new Error('Erro ao registrar baixa');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reagentes', id] });
      queryClient.invalidateQueries({ queryKey: ['reagentes'] });
    },
  });
}
