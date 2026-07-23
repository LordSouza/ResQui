export function pgrsTs() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

export function exportCsv(rows, filename) {
  const csv = rows.map(r =>
    r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')
  ).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  a.download = filename;
  a.click();
}

// Iniciais (1-2 letras) a partir do nome do usuário, com fallback para o e-mail.
export function iniciaisUsuario(user) {
  const base = (user?.nome || user?.email || '?').trim();
  const partes = base.split(/\s+/).filter(Boolean);
  const duas = partes.length >= 2 ? partes[0][0] + partes[partes.length - 1][0] : base.slice(0, 2);
  return duas.toUpperCase();
}
