import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export function useSolicitarRedefinicao() {
  return useMutation({
    mutationFn: async (email) => {
      await apiFetch('/api/auth/esqueci-senha', {
        method: 'POST',
        body: JSON.stringify({ Email: email }),
      });
    },
    onError: () => {},
  });
}

export function useRedefinirSenha() {
  return useMutation({
    mutationFn: async ({ token, novaSenha }) => {
      await apiFetch('/api/auth/redefinir-senha', {
        method: 'POST',
        body: JSON.stringify({ Token: token, NovaSenha: novaSenha }),
      });
    },
    onError: () => {},
  });
}
