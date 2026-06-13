import { apiFetch } from '../lib/api';

async function baixar(path, filename, erro) {
  const res = await apiFetch(path);
  if (!res.ok) throw new Error(erro);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadSinirCsv(id, numero) {
  return baixar(`/api/mtrs/${id}/export-sinir`, `pre-mtr-${(numero || id).toString().toLowerCase()}.csv`, 'Erro ao exportar pré-MTR');
}

export function downloadMtrPdf(id, numero) {
  return baixar(`/api/mtrs/${id}/pdf`, `${(numero || `mtr-${id}`).toString().toLowerCase()}.pdf`, 'Erro ao gerar PDF do MTR');
}
