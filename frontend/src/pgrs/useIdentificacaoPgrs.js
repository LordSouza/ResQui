import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

// Só razão social e unidade — GET /api/pgrs-config/identificacao exige apenas autenticação,
// ao contrário de useConfigPgrs (12 campos, policy Tecnico). Use este nos consumidores que
// precisam apenas identificar a instituição, como o resumo de segurança.
export function useIdentificacaoPgrs() {
  return useQuery({
    queryKey: ['identificacao-pgrs'],
    queryFn: async () => {
      const res = await apiFetch('/api/pgrs-config/identificacao');
      return res.json();
    },
  });
}
