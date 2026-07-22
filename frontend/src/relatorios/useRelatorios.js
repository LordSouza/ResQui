import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export function useRelatorios() {
  return useQuery({
    queryKey: ['relatorios'],
    queryFn: async () => {
      const res = await apiFetch('/api/relatorios');
      return res.json();
    },
  });
}
