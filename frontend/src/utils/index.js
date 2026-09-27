import { CODIGO_IBAMA_MISTURA, CODIGO_IBAMA_POR_TIPO, CLASSE_POR_TIPO } from '../data';

const UNIDADES_RESIDUO = ['L', 'mL', 'kg', 'g', 'm³'];

export function residuoInicialDoReagente(reagente) {
  const tipo = Object.keys(CLASSE_POR_TIPO).find(t => CLASSE_POR_TIPO[t] === reagente.classe);
  return {
    ...(tipo && { tipo }),
    ...(UNIDADES_RESIDUO.includes(reagente.unidade) && { unidade: reagente.unidade }),
    composicao: reagente.cas ? `${reagente.nome} (CAS ${reagente.cas})` : reagente.nome,
    classes: [reagente.classe],
  };
}

export function codigoIbamaDosResiduos(residuos) {
  if (!residuos?.length) return null;
  const codigos = new Set(residuos.map(r => CODIGO_IBAMA_POR_TIPO[r?.tipo] ?? CODIGO_IBAMA_MISTURA));
  return codigos.size === 1 ? [...codigos][0] : CODIGO_IBAMA_MISTURA;
}

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

const FATOR_LITROS = { l: 1, ml: 0.001, 'm³': 1000 };
const FATOR_QUILOS = { kg: 1, g: 0.001 };

export function quantidadesResiduos(residuos) {
  return (residuos ?? []).reduce((acc, r) => {
    const unidade = String(r?.unidade ?? '').toLowerCase();
    const volume = Number(r?.volume) || 0;
    if (unidade in FATOR_LITROS) acc.litros += volume * FATOR_LITROS[unidade];
    else if (unidade in FATOR_QUILOS) acc.quilos += volume * FATOR_QUILOS[unidade];
    return acc;
  }, { litros: 0, quilos: 0 });
}

export function dataBrasileira(iso) {
  return iso ? iso.slice(0, 10).split('-').reverse().join('/') : '—';
}

export function formatarQuantidade({ litros = 0, quilos = 0 } = {}, casas = 2) {
  const partes = [];
  if (litros > 0) partes.push(`${litros.toFixed(casas)} L`);
  if (quilos > 0) partes.push(`${quilos.toFixed(casas)} kg`);
  return partes.length > 0 ? partes.join(' · ') : '—';
}

export function decimalDocumento(valor, casas) {
  return Number(valor ?? 0).toFixed(casas).replace('.', ',');
}

export function formatarQuantidadeDocumento({ litros = 0, quilos = 0 } = {}) {
  const partes = [];
  if (litros > 0) partes.push(`${decimalDocumento(litros, 3)} L`);
  if (quilos > 0) partes.push(`${decimalDocumento(quilos, 3)} kg`);
  return partes.length > 0 ? partes.join(' · ') : '—';
}

export function completarMeses(mensal, quantidade, hoje = new Date()) {
  const porMes = new Map(mensal.map(m => [m.mes, m]));
  return Array.from({ length: quantidade }, (_, i) => {
    const data = new Date(hoje.getFullYear(), hoje.getMonth() - (quantidade - 1 - i), 1);
    const mes = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
    return porMes.get(mes) ?? { mes, litros: 0, quilos: 0 };
  });
}
