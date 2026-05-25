import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export function useCriarReagente() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (cmd) => {
      const res = await apiFetch('/api/reagentes', { method: 'POST', body: JSON.stringify(cmd) });
      if (!res.ok) throw new Error('Erro ao criar reagente');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reagentes'] }),
  });
}
