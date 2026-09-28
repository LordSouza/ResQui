import { describe, it, expect } from 'vitest';
import { parseCsv, mapearColunas, analisarImportacao } from '../../src/lib/csv';

describe('parseCsv', () => {
  it('parseia CSV separado por vírgula', () => {
    const { headers, rows } = parseCsv('Nome,CAS\nEtanol,64-17-5\n');
    expect(headers).toEqual(['Nome', 'CAS']);
    expect(rows).toEqual([['Etanol', '64-17-5']]);
  });

  it('detecta separador TAB', () => {
    const { headers, rows } = parseCsv('Nome\tCAS\nEtanol\t64-17-5');
    expect(headers).toEqual(['Nome', 'CAS']);
    expect(rows).toEqual([['Etanol', '64-17-5']]);
  });

  it('respeita aspas com vírgula interna', () => {
    const { rows } = parseCsv('Nome,Local\n"Ácido, 98%",Lab-201');
    expect(rows[0]).toEqual(['Ácido, 98%', 'Lab-201']);
  });

  it('ignora linhas vazias e BOM', () => {
    const { headers, rows } = parseCsv('﻿Nome,CAS\n\nEtanol,64-17-5\n\n');
    expect(headers).toEqual(['Nome', 'CAS']);
    expect(rows).toHaveLength(1);
  });
});

describe('mapearColunas', () => {
  it('reconhece aliases e ignora desconhecidas', () => {
    const mapa = mapearColunas(['Nome', 'CAS', 'Quantidade', 'Unid.', 'Local', 'Cor']);
    expect(mapa).toEqual({ Nome: 0, Cas: 1, Estoque: 2, Unidade: 3, Armario: 4 });
  });
});

describe('analisarImportacao', () => {
  const LAB = { id: 'Lab-201', nome: 'Lab-201', armarios: [] };
  const headers = ['Nome', 'CAS', 'Quantidade', 'Unid.', 'Local', 'Validade', 'Classe'];

  it('monta cmd com defaults para linha completa', () => {
    const rows = [['Etanol', '64-17-5', '2.5', 'L', 'Lab-201', '2027-01-01', '5']];
    const [item] = analisarImportacao(headers, rows, LAB);
    expect(item.bloqueada).toBe(false);
    expect(item.linhaCsv).toBe(2);
    expect(item.cmd).toMatchObject({
      Nome: 'Etanol', Cas: '64-17-5', Estoque: 2.5, Unidade: 'L', LaboratorioId: 'Lab-201', Armario: '',
      ClasseReatividade: 5, Controlado: false, Formula: '', Id: null,
    });
  });

  it('bloqueia linha sem obrigatório e lista o motivo', () => {
    const rows = [['', '64-17-5', '2.5', 'L', 'Lab-201', '', '5']];
    const [item] = analisarImportacao(headers, rows, LAB);
    expect(item.bloqueada).toBe(true);
    expect(item.cmd).toBeNull();
    expect(item.motivos).toContain('Nome ausente');
  });

  it('preserva os valores crus da linha bloqueada para identificá-la', () => {
    const rows = [['Tolueno', '108-88-3', '2', 'L', 'Lab-203', '', '']];
    const [item] = analisarImportacao(headers, rows, LAB);
    expect(item.bloqueada).toBe(true);
    expect(item.cmd).toBeNull();
    expect(item.bruto).toEqual({ Nome: 'Tolueno', Cas: '108-88-3', Estoque: '2', Unidade: 'L' });
  });

  it('marca aviso quando a validade já expirou', () => {
    const rows = [['Etanol', '64-17-5', '1', 'L', 'Lab-201', '2000-01-01', '5']];
    const [item] = analisarImportacao(headers, rows, LAB);
    expect(item.bloqueada).toBe(false);
    expect(item.avisos).toContain('Validade expirada');
  });

  it('aceita vírgula decimal (pt-BR) no estoque', () => {
    const rows = [['Etanol', '64-17-5', '2,5', 'L', 'Lab-201', '2027-01-01', '5']];
    const [item] = analisarImportacao(headers, rows, LAB);
    expect(item.bloqueada).toBe(false);
    expect(item.cmd.Estoque).toBe(2.5);
  });

  it('bloqueia linha quando a planilha não tem coluna de classe', () => {
    const semClasse = ['Nome', 'CAS', 'Quantidade', 'Unid.', 'Local', 'Validade'];
    const rows = [['Etanol', '64-17-5', '2.5', 'L', 'Lab-201', '2027-01-01']];
    const [item] = analisarImportacao(semClasse, rows, LAB);
    expect(item.bloqueada).toBe(true);
    expect(item.cmd).toBeNull();
    expect(item.motivos).toContain('Classe de reatividade ausente');
  });

  it('bloqueia linha com célula de classe vazia', () => {
    const rows = [['Etanol', '64-17-5', '2.5', 'L', 'Lab-201', '2027-01-01', '']];
    const [item] = analisarImportacao(headers, rows, LAB);
    expect(item.bloqueada).toBe(true);
    expect(item.motivos).toContain('Classe de reatividade ausente');
  });

  it.each(['abc', '3.7', '0', '13', '-1'])('bloqueia classe inválida: %s', (valor) => {
    const rows = [['Etanol', '64-17-5', '2.5', 'L', 'Lab-201', '2027-01-01', valor]];
    const [item] = analisarImportacao(headers, rows, LAB);
    expect(item.bloqueada).toBe(true);
    expect(item.cmd).toBeNull();
    expect(item.motivos).toContain('Classe de reatividade inválida');
  });

  it.each(['1', '12'])('aceita os limites válidos da faixa: %s', (valor) => {
    const rows = [['Etanol', '64-17-5', '2.5', 'L', 'Lab-201', '2027-01-01', valor]];
    const [item] = analisarImportacao(headers, rows, LAB);
    expect(item.bloqueada).toBe(false);
    expect(item.cmd.ClasseReatividade).toBe(Number(valor));
  });

  it.each(['5.0', '05'])('aceita forma numérica não-canônica da classe: %s', (valor) => {
    const rows = [['Etanol', '64-17-5', '2.5', 'L', 'Lab-201', '2027-01-01', valor]];
    const [item] = analisarImportacao(headers, rows, LAB);
    expect(item.bloqueada).toBe(false);
    expect(item.cmd.ClasseReatividade).toBe(5);
  });

  it('acumula o motivo da classe junto dos demais motivos', () => {
    const rows = [['', '64-17-5', '2.5', 'L', 'Lab-201', '2027-01-01', '']];
    const [item] = analisarImportacao(headers, rows, LAB);
    expect(item.motivos).toContain('Nome ausente');
    expect(item.motivos).toContain('Classe de reatividade ausente');
  });

  describe('armário', () => {
    const QUIMICA = { id: 'Lab-001', nome: 'Química', armarios: ['Armário A', 'Armário B'] };
    const linha = (armario) => [['Etanol', '64-17-5', '1', 'L', armario, '2027-01-01', '5']];

    it('grava o armário da coluna no laboratório escolhido', () => {
      const [item] = analisarImportacao(headers, linha('Armário B'), QUIMICA);
      expect(item.cmd).toMatchObject({ LaboratorioId: 'Lab-001', Armario: 'Armário B' });
    });

    it('aceita o formato antigo "Laboratório · Armário" quando o prefixo é o laboratório escolhido', () => {
      const [item] = analisarImportacao(headers, linha('Química · Armário A'), QUIMICA);
      expect(item.cmd).toMatchObject({ LaboratorioId: 'Lab-001', Armario: 'Armário A' });
    });

    it('bloqueia armário que o laboratório não tem', () => {
      const [item] = analisarImportacao(headers, linha('Outro Lab · Armário A'), QUIMICA);
      expect(item.bloqueada).toBe(true);
      expect(item.motivos).toContain('Armário Outro Lab · Armário A não existe em Química');
    });

    it('bloqueia armário ausente quando o laboratório tem mais de um', () => {
      const [item] = analisarImportacao(headers, linha(''), QUIMICA);
      expect(item.motivos).toContain('Armário ausente');
    });

    it('usa o único armário do laboratório quando a coluna vem vazia', () => {
      const unico = { id: 'Lab-002', nome: 'Física', armarios: ['Armário C'] };
      const [item] = analisarImportacao(headers, linha(''), unico);
      expect(item.cmd).toMatchObject({ LaboratorioId: 'Lab-002', Armario: 'Armário C' });
    });
  });
});
