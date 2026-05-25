import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export function useArquivarUsuario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const res = await apiFetch(`/api/usuarios/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 404) throw new Error('Erro ao arquivar usuário');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['usuarios'] }),
  });
}
