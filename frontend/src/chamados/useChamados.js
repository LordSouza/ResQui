import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export function useChamados() {
  return useQuery({
    queryKey: ['chamados'],
    queryFn: async () => {
      const res = await apiFetch('/api/chamados');
      return res.json();
    },
  });
}
