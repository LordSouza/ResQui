import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

function normalizeItem(n) {
  return { ...n, criada_em: n.criadaEm, referencia_id: n.referenciaId };
}

export function useNotificacoes() {
  return useQuery({
    queryKey: ['notificacoes'],
    queryFn: async () => {
      const res = await apiFetch('/api/notificacoes');
      const data = await res.json();
      return data.map(normalizeItem);
    },
    refetchInterval: 60_000,
  });
}
