import { apiFetch } from '../lib/api';

export async function downloadRotulo(id) {
  const res = await apiFetch(`/api/reagentes/${id}/rotulo`);
  if (!res.ok) throw new Error('Erro ao gerar rótulo');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rotulo-${id.toLowerCase()}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
