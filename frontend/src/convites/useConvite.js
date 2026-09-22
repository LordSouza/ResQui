import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export function useConvite(token) {
  return useQuery({
    queryKey: ['convite', token],
    queryFn: async () => {
      const res = await apiFetch(`/api/convites/${encodeURIComponent(token)}`);
      return res.json();
    },
    enabled: !!token,
    retry: false,
  });
}
