import { AUDITORIA } from '../data';

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

export function logAudit(what, detail, where = '-', risk = 'low') {
  AUDITORIA.unshift({ ts: pgrsTs(), who: 'Lucas Souza', what, where, detail, risk });
}
