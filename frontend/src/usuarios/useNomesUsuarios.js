import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export function useNomesUsuarios(options = {}) {
  return useQuery({
    queryKey: ['usuarios-nomes'],
    queryFn: async () => {
      const res = await apiFetch('/api/usuarios/nomes');
      return res.json();
    },
    enabled: options.enabled ?? true,
  });
}
