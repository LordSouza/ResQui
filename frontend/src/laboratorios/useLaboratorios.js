import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

function normalizeItem(l) {
  return { ...l, area_m2: l.areaM2 };
}

export function useLaboratorios() {
  return useQuery({
    queryKey: ['laboratorios'],
    queryFn: async () => {
      const res = await apiFetch('/api/laboratorios');
      const data = await res.json();
      return data.map(normalizeItem);
    },
  });
}
