import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export function useDefinirLaboratorios() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, laboratorioIds }) =>
      apiFetch(`/api/usuarios/${id}/laboratorios`, {
        method: 'PUT',
        body: JSON.stringify({ LaboratorioIds: laboratorioIds }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['usuarios'] }),
  });
}
