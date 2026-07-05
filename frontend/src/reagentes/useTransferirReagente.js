import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export function useTransferirReagente(id) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ destino }) => {
      const res = await apiFetch(`/api/reagentes/${id}/transferencia`, {
        method: 'POST',
        body: JSON.stringify({ Destino: destino }),
      });
      if (!res.ok) throw new Error('Erro ao transferir reagente');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reagentes', id] });
      queryClient.invalidateQueries({ queryKey: ['reagentes'] });
    },
  });
}
