import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export function useMtr(id) {
  return useQuery({
    queryKey: ['mtrs', id],
    queryFn: async () => {
      const res = await apiFetch(`/api/mtrs/${id}`);
      if (!res.ok) throw new Error('Erro ao carregar MTR');
      return res.json();
    },
    enabled: !!id,
  });
}
