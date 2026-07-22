import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export function useComentarChamado() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, texto }) => {
      const res = await apiFetch(`/api/chamados/${id}/comentarios`, {
        method: 'POST',
        body: JSON.stringify({ Texto: texto }),
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chamados'] }),
  });
}
