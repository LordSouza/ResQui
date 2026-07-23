import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export function useAtualizarPerfil() {
  return useMutation({
    mutationFn: async ({ Nome, Email }) => {
      const res = await apiFetch('/api/auth/me', {
        method: 'PUT',
        body: JSON.stringify({ Nome, Email }),
      });
      return res.json();
    },
  });
}
