import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

function normalize(r) {
  return {
    ...r,
    lab_id: r.laboratorioId,
    mtr_id: r.mtrId,
    data_registro: r.dataRegistro,
    classes: r.classesReatividade ?? [],
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
      const data = await res.json();
      return (Array.isArray(data) ? data : []).map(normalize);
    },
  });
}
