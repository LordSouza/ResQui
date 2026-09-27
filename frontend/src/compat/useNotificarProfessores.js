import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export function useNotificarProfessores() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cmd) => {
      const res = await apiFetch('/api/compat/notificar', { method: 'POST', body: JSON.stringify(cmd) });
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notificacoes'] }),
  });
}
