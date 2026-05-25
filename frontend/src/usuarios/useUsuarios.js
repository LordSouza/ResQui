import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

const AVATAR_COLORS = ['#1465c0', '#5b3c8c', '#1f7a3e', '#b76e00', '#0d4a8c', '#b3261e'];

function deriveIniciais(nome) {
  const parts = (nome || '').trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase() || '?';
}

function normalizeItem(u, index) {
  const nome = u.nome ?? u.email;
  return {
    ...u,
    nome,
    status: u.arquivado ? 'arquivado' : 'ativo',
    iniciais: deriveIniciais(nome),
    cor: AVATAR_COLORS[index % AVATAR_COLORS.length],
  };
}

export function useUsuarios() {
  return useQuery({
    queryKey: ['usuarios'],
    queryFn: async () => {
      const res = await apiFetch('/api/usuarios');
      if (!res.ok) throw new Error('Erro ao carregar usuários');
      const data = await res.json();
      return data.map(normalizeItem);
    },
  });
}
