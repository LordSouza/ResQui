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

export function useAtivar2fa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (codigo) => {
      const res = await apiFetch('/api/auth/2fa/ativar', { method: 'POST', body: JSON.stringify({ Codigo: codigo }) });
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] }),
  });
}

export function useGerarCodigosRecuperacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (codigo) => {
      const res = await apiFetch('/api/auth/2fa/codigos-recuperacao', {
        method: 'POST',
        body: JSON.stringify({ Codigo: codigo }),
      });
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] }),
  });
}

export function useDesativar2fa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (codigo) => {
      await apiFetch('/api/auth/2fa/desativar', { method: 'POST', body: JSON.stringify({ Codigo: codigo }) });
      return true;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] }),
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
