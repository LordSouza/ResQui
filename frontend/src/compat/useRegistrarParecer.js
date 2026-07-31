import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export function useRegistrarParecer() {
  return useMutation({
    mutationFn: (cmd) =>
      apiFetch('/api/compat/parecer', { method: 'POST', body: JSON.stringify(cmd) }),
  });
}
