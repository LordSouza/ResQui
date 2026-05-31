import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export function useNotificacaoPrefs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (prefs) => {
      await apiFetch('/api/notificacoes/prefs', { method: 'PUT', body: JSON.stringify(prefs) });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notificacoes-prefs'] }),
  });
}
