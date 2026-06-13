import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export function useBaixaLote(reagenteId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ loteId, quantidade }) => {
      const res = await apiFetch(`/api/reagentes/${reagenteId}/lotes/${loteId}/baixa`, {
        method: 'POST',
        body: JSON.stringify({ Quantidade: quantidade }),
      });
      if (!res.ok) throw new Error('Erro ao registrar baixa do lote');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reagentes'] });
    },
  });
}
