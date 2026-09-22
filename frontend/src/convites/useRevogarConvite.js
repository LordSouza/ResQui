import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export function useRevogarConvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      await apiFetch(`/api/convites/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['convites'] }),
    onError: () => {},
  });
}
