import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

function normalize(m) {
  return {
    ...m,
    codigo_ibama: m.codigoIbama,
    data_emissao: m.dataEmissao,
    residuo_ids: m.residuoIds ?? [],
    data_destinacao: m.dataDestinacao ?? null,
    destinado_por_id: m.destinadoPorId ?? null,
    total_litros: m.totalLitros ?? 0,
    total_quilos: m.totalQuilos ?? 0,
  };
}

export function useMtrs(options = {}) {
  return useQuery({
    queryKey: ['mtrs'],
    queryFn: async () => {
      const res = await apiFetch('/api/mtrs');
      const data = await res.json();
      return data.map(normalize);
    },
    enabled: options.enabled ?? true,
  });
}
