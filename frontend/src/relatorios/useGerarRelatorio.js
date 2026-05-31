import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export function useGerarRelatorio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (cmd) => {
      const res = await apiFetch('/api/relatorios/gerar', {
        method: 'POST',
        body: JSON.stringify(cmd),
      });
      if (!res.ok) throw new Error('Erro ao gerar relatório');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['relatorios'] }),
  });
}
