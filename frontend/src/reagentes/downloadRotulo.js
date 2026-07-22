import { apiFetch } from '../lib/api';

async function baixarPdf(path, filename) {
  const res = await apiFetch(path);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadRotulo(id) {
  return baixarPdf(`/api/reagentes/${id}/rotulo`, `rotulo-${id.toLowerCase()}.pdf`);
}

export function downloadRotuloLote(id, loteId) {
  return baixarPdf(`/api/reagentes/${id}/lotes/${loteId}/rotulo`, `etiqueta-${id.toLowerCase()}-lote-${loteId}.pdf`);
}
