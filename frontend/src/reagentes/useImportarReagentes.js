import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export function useImportarReagentes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (cmds) => {
      const res = await apiFetch('/api/reagentes/importar-lote', { method: 'POST', body: JSON.stringify(cmds) });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reagentes'] }),
  });
}
