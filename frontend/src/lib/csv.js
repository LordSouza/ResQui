// Parser de CSV/TSV e análise de importação de reagentes (funções puras).

export function parseCsv(text) {
  const clean = String(text).replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const linhas = clean.split('\n').filter(l => l.trim() !== '');
  if (linhas.length === 0) return { headers: [], rows: [] };

  const virgulas = (linhas[0].match(/,/g) || []).length;
  const tabs = (linhas[0].match(/\t/g) || []).length;
  const sep = tabs > virgulas ? '\t' : ',';

  const parseLinha = (linha) => {
    const campos = [];
    let atual = '', aspas = false;
    for (let i = 0; i < linha.length; i++) {
      const c = linha[i];
      if (aspas) {
        if (c === '"' && linha[i + 1] === '"') { atual += '"'; i++; }
        else if (c === '"') aspas = false;
        else atual += c;
      } else if (c === '"') aspas = true;
      else if (c === sep) { campos.push(atual); atual = ''; }
      else atual += c;
    }
    campos.push(atual);
    return campos.map(s => s.trim());
  };

  return { headers: parseLinha(linhas[0]), rows: linhas.slice(1).map(parseLinha) };
}

export const CAMPOS_IMPORT = [
  { campo: 'Nome', aliases: ['nome'], obrigatorio: true },
  { campo: 'Cas', aliases: ['cas'], obrigatorio: true },
  { campo: 'Estoque', aliases: ['estoque', 'quantidade', 'qtd'], obrigatorio: true },
  { campo: 'Unidade', aliases: ['unidade', 'unid', 'unid.'], obrigatorio: true },
  { campo: 'Armario', aliases: ['armario', 'armário', 'local', 'localizacao', 'localização'], obrigatorio: false },
  { campo: 'Formula', aliases: ['formula', 'fórmula'], obrigatorio: false },
  { campo: 'Validade', aliases: ['validade'], obrigatorio: false },
  { campo: 'ClasseReatividade', aliases: ['classe', 'classereatividade', 'reatividade'], obrigatorio: true },
  { campo: 'Controlado', aliases: ['controlado'], obrigatorio: false },
  { campo: 'Sinonimo', aliases: ['sinonimo', 'sinônimo'], obrigatorio: false },
];

const norm = (s) => String(s ?? '').trim().toLowerCase();

export function mapearColunas(headers) {
  const mapa = {};
  headers.forEach((h, i) => {
    const def = CAMPOS_IMPORT.find(c => c.aliases.includes(norm(h)));
    if (def && !(def.campo in mapa)) mapa[def.campo] = i;
  });
  return mapa;
}

const SEPARADOR_DE_LOCAL = ' · ';

function armarioDaLinha(valor, laboratorio) {
  if (valor === laboratorio.nome) return '';
  const prefixo = laboratorio.nome + SEPARADOR_DE_LOCAL;
  return valor.startsWith(prefixo) ? valor.slice(prefixo.length) : valor;
}

function problemaDoArmario(armario, laboratorio) {
  const armarios = laboratorio.armarios ?? [];
  if (armarios.length === 0) return armario ? `Armário ${armario} não existe em ${laboratorio.nome}` : '';
  if (!armario) return 'Armário ausente';
  return armarios.includes(armario) ? '' : `Armário ${armario} não existe em ${laboratorio.nome}`;
}

export function analisarImportacao(headers, rows, laboratorio) {
  const mapa = mapearColunas(headers);
  const hoje = new Date().toISOString().slice(0, 10);
  const get = (row, campo) => {
    const i = mapa[campo];
    return i == null ? '' : String(row[i] ?? '').trim();
  };

  return rows.map((row, idx) => {
    const nome = get(row, 'Nome');
    const cas = get(row, 'Cas');
    const estoqueRaw = get(row, 'Estoque');
    const unidade = get(row, 'Unidade');
    const armarioInformado = armarioDaLinha(get(row, 'Armario'), laboratorio);
    const armarios = laboratorio.armarios ?? [];
    const armario = !armarioInformado && armarios.length === 1 ? armarios[0] : armarioInformado;
    const estoque = Number(estoqueRaw.replace(',', '.'));
    const classeRaw = get(row, 'ClasseReatividade');
    const classe = Number(classeRaw);

    const motivos = [];
    if (!nome) motivos.push('Nome ausente');
    if (!cas) motivos.push('CAS ausente');
    if (!estoqueRaw || Number.isNaN(estoque)) motivos.push('Estoque inválido');
    if (!unidade) motivos.push('Unidade ausente');
    const problemaDeArmario = problemaDoArmario(armario, laboratorio);
    if (problemaDeArmario) motivos.push(problemaDeArmario);
    if (!classeRaw) motivos.push('Classe de reatividade ausente');
    else if (!Number.isInteger(classe) || classe < 1 || classe > 12) motivos.push('Classe de reatividade inválida');

    const validade = get(row, 'Validade');
    const avisos = [];
    if (validade && /^\d{4}-\d{2}-\d{2}$/.test(validade) && validade < hoje) avisos.push('Validade expirada');

    const controlado = ['sim', 'true', '1', 'x'].includes(norm(get(row, 'Controlado')));

    const cmd = motivos.length ? null : {
      Id: null,
      Nome: nome,
      Cas: cas,
      Formula: get(row, 'Formula') || '',
      Sinonimo: get(row, 'Sinonimo') || null,
      ClasseReatividade: classe,
      Estoque: estoque,
      EstoqueMin: null,
      Unidade: unidade,
      Validade: validade || null,
      LaboratorioId: laboratorio.id,
      Armario: armario,
      Controlado: controlado,
      Lote: null,
      Ghs: null,
    };

    const bruto = { Nome: nome, Cas: cas, Estoque: estoqueRaw, Unidade: unidade };

    return { linhaCsv: idx + 2, cmd, bruto, avisos, bloqueada: motivos.length > 0, motivos };
  });
}
