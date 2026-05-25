import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

function normalizeDetail(r) {
  return {
    ...r,
    classe: r.classeReatividade,
    validade_status: r.validadeStatus,
    estoque_min: r.estoqueMin,
    pictos: r.ghs?.pictos ?? [],
    signal: r.ghs?.signal ?? '',
    h: r.ghs?.frasesH ?? [],
    p: r.ghs?.frasesP ?? [],
    abertura: r.aberturaData ?? '',
  };
}

export function useReagente(id) {
  return useQuery({
    queryKey: ['reagentes', id],
    queryFn: async () => {
      const res = await apiFetch(`/api/reagentes/${id}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error('Erro ao carregar reagente');
      return normalizeDetail(await res.json());
    },
    enabled: !!id,
  });
}
