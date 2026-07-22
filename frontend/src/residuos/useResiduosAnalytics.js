import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export function useResiduosAnalytics({ meses = 6 } = {}) {
  return useQuery({
    queryKey: ['residuos-analytics', { meses }],
    queryFn: async () => {
      const res = await apiFetch('/api/residuos/analytics', { params: { meses } });
      return res.json();
    },
  });
}
