import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export function useLotes(reagenteId) {
  return useQuery({
    queryKey: ['reagentes', reagenteId, 'lotes'],
    enabled: !!reagenteId,
    queryFn: async () => {
      const res = await apiFetch(`/api/reagentes/${reagenteId}/lotes`);
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });
}
