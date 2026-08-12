import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export function useAssistente() {
  return useMutation({
    mutationFn: async ({ mensagem, historico }) => {
      const res = await apiFetch('/api/assistente/mensagem', {
        method: 'POST',
        body: JSON.stringify({ Mensagem: mensagem, Historico: historico }),
      });
      return res.json();
    },
    onError: () => {},
  });
}
