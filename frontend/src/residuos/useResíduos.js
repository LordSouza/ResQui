import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

function normalize(r) {
  return {
    ...r,
    lab_id: r.laboratorioId,
    mtr_id: r.mtrId,
    data_registro: r.dataRegistro,
  };
}

export function useResíduos(filtro = {}) {
  const { labId, mtrId, status } = filtro;
  return useQuery({
    queryKey: ['residuos', filtro],
    queryFn: async () => {
      const params = {};
      if (labId) params.labId = labId;
      if (mtrId) params.mtrId = mtrId;
      if (status) params.status = status;
      const res = await apiFetch('/api/residuos', { params });
      if (!res.ok) throw new Error('Erro ao carregar resíduos');
      const data = await res.json();
      return data.map(normalize);
    },
  });
}
