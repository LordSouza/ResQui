import { parseCsv } from './csv';

export const FORMATOS_ACEITOS = '.xlsx,.csv,.tsv';

export class FormatoNaoSuportadoError extends Error {
  constructor() {
    super('Formato não suportado — salve a planilha como .xlsx (Excel) ou .csv.');
  }
}

const extensao = (nome) => String(nome).toLowerCase().split('.').pop();

function celulaComoTexto(celula) {
  if (celula instanceof Date) return celula.toISOString().slice(0, 10);
  return String(celula ?? '').trim();
}

export function tabelaDaAba(linhas) {
  const preenchidas = linhas
    .map(linha => linha.map(celulaComoTexto))
    .filter(linha => linha.some(celula => celula !== ''));
  if (preenchidas.length === 0) return { headers: [], rows: [] };
  return { headers: preenchidas[0], rows: preenchidas.slice(1) };
}

export async function lerPlanilha(arquivo) {
  const formato = extensao(arquivo.name);
  if (formato === 'csv' || formato === 'tsv') return parseCsv(await arquivo.text());
  if (formato !== 'xlsx') throw new FormatoNaoSuportadoError();
  const { readSheet } = await import('read-excel-file/browser');
  return tabelaDaAba(await readSheet(await arquivo.arrayBuffer()));
}
