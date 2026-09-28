import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export function useTransferirReagente(id) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ laboratorioId, armario }) => {
      const res = await apiFetch(`/api/reagentes/${id}/transferencia`, {
        method: 'POST',
        body: JSON.stringify({ LaboratorioId: laboratorioId, Armario: armario }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reagentes', id] });
      queryClient.invalidateQueries({ queryKey: ['reagentes'] });
    },
  });
}
