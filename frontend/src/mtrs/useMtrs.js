import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

function normalize(m) {
  return {
    ...m,
    codigo_ibama: m.codigoIbama,
    data_emissao: m.dataEmissao,
    residuo_ids: m.residuoIds ?? [],
    status: m.status.toLowerCase().replace('pendenteenvio', 'pendente-sinir')
                                   .replace('aceitosinir', 'aceito-sinir')
                                   .replace('pendentesinir', 'pendente-sinir'),
  };
}

export function useMtrs() {
  return useQuery({
    queryKey: ['mtrs'],
    queryFn: async () => {
      const res = await apiFetch('/api/mtrs');
      if (!res.ok) throw new Error('Erro ao carregar MTRs');
      const data = await res.json();
      return data.map(normalize);
    },
  });
}
