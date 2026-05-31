import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export function useGetNotificacaoPrefs() {
  return useQuery({
    queryKey: ['notificacoes-prefs'],
    queryFn: async () => {
      const res = await apiFetch('/api/notificacoes/prefs');
      return res.json();
    },
  });
}
