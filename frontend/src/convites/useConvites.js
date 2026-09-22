import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export function useConvites(options = {}) {
  return useQuery({
    queryKey: ['convites'],
    queryFn: async () => {
      const res = await apiFetch('/api/convites');
      return res.json();
    },
    enabled: options.enabled ?? true,
  });
}
