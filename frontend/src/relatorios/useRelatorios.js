import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export function useRelatorios() {
  return useQuery({
    queryKey: ['relatorios'],
    queryFn: async () => {
      const res = await apiFetch('/api/relatorios');
      if (!res.ok) throw new Error('Erro ao carregar relatórios');
      return res.json();
    },
  });
}
