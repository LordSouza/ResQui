import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export function useCriarLaboratorio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (cmd) => {
      const res = await apiFetch('/api/laboratorios', { method: 'POST', body: JSON.stringify(cmd) });
      if (!res.ok) throw new Error('Erro ao criar laboratório');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['laboratorios'] }),
  });
}
