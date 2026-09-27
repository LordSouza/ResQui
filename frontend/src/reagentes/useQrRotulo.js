import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

function lerComoDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(leitor.result);
    leitor.onerror = () => reject(leitor.error);
    leitor.readAsDataURL(blob);
  });
}

export function useQrRotulo(reagenteId) {
  return useQuery({
    queryKey: ['reagentes', reagenteId, 'qr'],
    enabled: !!reagenteId,
    staleTime: Infinity,
    queryFn: async () => {
      const res = await apiFetch(`/api/reagentes/${reagenteId}/rotulo/qr`);
      return lerComoDataUrl(await res.blob());
    },
  });
}
