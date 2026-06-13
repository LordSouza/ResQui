import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export function useMovimentacoes(reagenteId, limite = 20) {
  return useQuery({
    queryKey: ['reagentes', reagenteId, 'movimentacoes'],
    enabled: !!reagenteId,
    queryFn: async () => {
      const res = await apiFetch(`/api/reagentes/${reagenteId}/movimentacoes`, { params: { limite } });
      if (!res.ok) throw new Error('Erro ao carregar movimentações');
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });
}
