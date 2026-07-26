import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export function useConfigPgrs() {
  return useQuery({
    queryKey: ['config-pgrs'],
    queryFn: async () => {
      const res = await apiFetch('/api/pgrs-config');
      return res.json();
    },
  });
}
