import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export function useCompatOverrides() {
  return useQuery({
    queryKey: ['compat-overrides'],
    queryFn: async () => {
      const res = await apiFetch('/api/compat/overrides');
      return res.json();
    },
    staleTime: 30_000,
  });
}
