import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export function useLaboratorios() {
  return useQuery({
    queryKey: ['laboratorios'],
    queryFn: async () => {
      const res = await apiFetch('/api/laboratorios');
      return res.json();
    },
  });
}
