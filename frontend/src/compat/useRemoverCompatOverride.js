import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export function useRemoverCompatOverride() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ classeA, classeB }) =>
      apiFetch(`/api/compat/overrides/${classeA}/${classeB}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['compat-matriz'] });
      qc.invalidateQueries({ queryKey: ['compat-overrides'] });
    },
  });
}
