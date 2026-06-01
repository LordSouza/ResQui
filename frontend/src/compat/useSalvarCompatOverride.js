import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export function useSalvarCompatOverride() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ classeA, classeB, ...cmd }) =>
      apiFetch(`/api/compat/overrides/${classeA}/${classeB}`, {
        method: 'PUT',
        body: JSON.stringify(cmd),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['compat-matriz'] });
      qc.invalidateQueries({ queryKey: ['compat-overrides'] });
    },
  });
}
