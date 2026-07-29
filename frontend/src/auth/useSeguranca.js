import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export function useAlterarSenha() {
  return useMutation({
    mutationFn: async ({ senhaAtual, novaSenha }) => {
      await apiFetch('/api/auth/alterar-senha', {
        method: 'POST',
        body: JSON.stringify({ SenhaAtual: senhaAtual, NovaSenha: novaSenha }),
      });
      return true;
    },
  });
}

export function useSetup2fa() {
  return useMutation({
    mutationFn: async () => {
      const res = await apiFetch('/api/auth/2fa/setup', { method: 'POST' });
      return res.json();
    },
  });
}

// O perfil do usuário não é uma query do React Query — vive no AuthContext, que só busca
// /api/auth/me no mount da página. Estes três hooks invalidavam ['me'], uma key que ninguém
// consome; quem sincroniza o estado do 2FA é o `updateUser` do AuthContext, chamado no
// onSuccess de cada mutation em FormSenha2FA.
export function useAtivar2fa() {
  return useMutation({
    mutationFn: async (codigo) => {
      const res = await apiFetch('/api/auth/2fa/ativar', { method: 'POST', body: JSON.stringify({ Codigo: codigo }) });
      return res.json();
    },
  });
}

export function useGerarCodigosRecuperacao() {
  return useMutation({
    mutationFn: async (codigo) => {
      const res = await apiFetch('/api/auth/2fa/codigos-recuperacao', {
        method: 'POST',
        body: JSON.stringify({ Codigo: codigo }),
      });
      return res.json();
    },
  });
}

export function useDesativar2fa() {
  return useMutation({
    mutationFn: async (codigo) => {
      await apiFetch('/api/auth/2fa/desativar', { method: 'POST', body: JSON.stringify({ Codigo: codigo }) });
      return true;
    },
  });
}

export function useSessoes() {
  return useQuery({
    queryKey: ['sessoes'],
    queryFn: async () => {
      const res = await apiFetch('/api/auth/sessoes');
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useRevogarSessao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (jti) => {
      await apiFetch(`/api/auth/sessoes/${jti}`, { method: 'DELETE' });
      return true;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessoes'] }),
  });
}

export function useRevogarOutrasSessoes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await apiFetch('/api/auth/sessoes/revogar-outras', { method: 'POST' });
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessoes'] }),
  });
}
