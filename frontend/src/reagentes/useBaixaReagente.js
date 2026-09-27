import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export function useBaixaReagente(id) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ quantidade, motivo }) => {
      const res = await apiFetch(`/api/reagentes/${id}/baixa`, {
        method: 'POST',
        body: JSON.stringify({ Quantidade: quantidade, Motivo: motivo }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reagentes', id] });
      queryClient.invalidateQueries({ queryKey: ['reagentes'] });
    },
  });
}
