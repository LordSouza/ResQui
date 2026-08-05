import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export function useReabrirDestinacao() {
  const queryClient = useQueryClient();
  return useMutation({
    // 204 sem corpo — nada a ler da resposta.
    mutationFn: (id) => apiFetch(`/api/mtrs/${id}/destinacao`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mtrs'] });
      queryClient.invalidateQueries({ queryKey: ['residuos'] });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['mtrs'] });
      queryClient.invalidateQueries({ queryKey: ['residuos'] });
    },
  });
}
