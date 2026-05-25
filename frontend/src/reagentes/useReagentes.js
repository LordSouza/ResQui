import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

function normalizeItem(r) {
  return {
    ...r,
    classe: r.classeReatividade,
    validade_status: r.validadeStatus,
    estoque_min: r.estoqueMin,
    pictos: [],
    signal: '',
  };
}

export function useReagentes(filtro = {}) {
  const { page = 1, pageSize = 20, q = '', classe = null, vencendo = false } = filtro;

  return useQuery({
    queryKey: ['reagentes', { page, pageSize, q, classe, vencendo }],
    queryFn: async () => {
      const params = { page, pageSize };
      if (q) params.q = q;
      if (classe) params.classe = classe;
      if (vencendo) params.vencendo = true;
      const res = await apiFetch('/api/reagentes', { params });
      if (!res.ok) throw new Error('Erro ao carregar reagentes');
      const data = await res.json();
      return { ...data, items: data.items.map(normalizeItem) };
    },
  });
}
