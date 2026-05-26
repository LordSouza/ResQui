import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export function useAuditoria(filtro = {}) {
  return useQuery({
    queryKey: ['auditoria', filtro],
    queryFn: async () => {
      const res = await apiFetch('/api/auditoria', { params: filtro });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.map(e => ({ ...e, ts: e.timestamp }));
    },
  });
}
