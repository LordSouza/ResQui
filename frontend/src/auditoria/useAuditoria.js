import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export function useAuditoria(filtro = {}) {
  return useQuery({
    queryKey: ['auditoria', filtro],
    queryFn: async () => {
      const res = await apiFetch('/api/auditoria', { params: filtro });
      const data = await res.json();
      return data.map(e => ({ ...e, ts: e.timestamp }));
    },
  });
}

export function useVerificarCadeia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await apiFetch('/api/auditoria/verificacao');
      return { ...(await res.json()), verificadoEm: new Date() };
    },
    // A própria verificação entra na trilha; recarrega a lista para mostrá-la.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['auditoria'] }),
  });
}

export async function obterAncoraAuditoria() {
  const res = await apiFetch('/api/auditoria/ancora');
  return res.status === 204 ? null : res.json();
}
