import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

export function useCompatMatriz() {
  return useQuery({
    queryKey: ['compat-matriz'],
    queryFn: async () => {
      const res = await apiFetch('/api/compat/matriz');
      return res.json();
    },
    select: (data) => {
      const matrix = {};
      for (const { classeA, classeB, nivel } of data.entries) {
        if (!matrix[classeA]) matrix[classeA] = [];
        matrix[classeA][classeB - 1] = nivel;
      }
      return matrix;
    },
    staleTime: 30_000,
  });
}
