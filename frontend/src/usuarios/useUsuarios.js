import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';
import { iniciaisUsuario } from '../utils';

const AVATAR_COLORS = ['#1465c0', '#5b3c8c', '#1f7a3e', '#b76e00', '#0d4a8c', '#b3261e'];

function normalizeItem(u, index) {
  const nome = u.nome ?? u.email;
  return {
    ...u,
    nome,
    status: u.arquivado ? 'arquivado' : 'ativo',
    iniciais: iniciaisUsuario({ nome }),
    cor: AVATAR_COLORS[index % AVATAR_COLORS.length],
    mfa: !!u.twoFactorEnabled,
  };
}

export function useUsuarios(options = {}) {
  return useQuery({
    queryKey: ['usuarios'],
    queryFn: async () => {
      const res = await apiFetch('/api/usuarios');
      const data = await res.json();
      return data.map(normalizeItem);
    },
    enabled: options.enabled ?? true,
  });
}
