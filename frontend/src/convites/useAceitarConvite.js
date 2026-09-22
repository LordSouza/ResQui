import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export function useAceitarConvite() {
  return useMutation({
    mutationFn: async ({ token, ...cmd }) => {
      await apiFetch(`/api/convites/${encodeURIComponent(token)}/aceitar`, {
        method: 'POST',
        body: JSON.stringify(cmd),
      });
    },
    onError: () => {},
  });
}
