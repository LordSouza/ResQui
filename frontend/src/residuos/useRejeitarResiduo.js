import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

// RF06 — rejeita a solicitação de descarte (move solicitado → rejeitado). Requer Gestor+.
export function useRejeitarResiduo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, motivo = null }) => {
      const res = await apiFetch(`/api/residuos/${id}/rejeitar`, {
        method: 'PUT',
        body: JSON.stringify({ Motivo: motivo }),
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['residuos'] }),
  });
}
