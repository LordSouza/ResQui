import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export function useCriarLaboratorio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (cmd) => {
      const res = await apiFetch('/api/laboratorios', { method: 'POST', body: JSON.stringify(cmd) });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['laboratorios'] }),
  });
}
