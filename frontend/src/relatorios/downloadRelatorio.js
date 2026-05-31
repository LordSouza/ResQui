import { apiFetch } from '../lib/api';

export async function downloadRelatorio(id, titulo) {
  const res = await apiFetch(`/api/relatorios/${id}/download`);
  if (!res.ok) throw new Error('Erro ao baixar relatório');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(titulo || 'relatorio').replace(/ /g, '-').toLowerCase()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
