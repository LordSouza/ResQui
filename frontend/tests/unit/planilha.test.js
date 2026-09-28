import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { lerPlanilha, tabelaDaAba, FormatoNaoSuportadoError } from '../../src/lib/planilha';
import { analisarImportacao } from '../../src/lib/csv';

const INVENTARIO_XLSX = readFileSync(resolve(__dirname, '../fixtures/inventario.xlsx'));

const arquivo = (conteudo, nome) => new File([conteudo], nome);

describe('lerPlanilha', () => {
  it('lê a primeira aba do .xlsx como cabeçalhos e linhas de texto', async () => {
    const { headers, rows } = await lerPlanilha(arquivo(INVENTARIO_XLSX, 'inventario.xlsx'));

    expect(headers).toEqual(['Nome', 'CAS', 'Quantidade', 'Unidade', 'Local', 'Validade', 'Classe', 'Controlado']);
    expect(rows).toEqual([
      ['Etanol', '64-17-5', '2.5', 'L', 'Lab-201', '2027-10-31', '5', 'true'],
      ['Tolueno', '108-88-3', '2', 'L', 'Lab-203', '2020-01-15', '', 'false'],
    ]);
  });

  it('entrega à análise de importação o mesmo que um CSV entregaria', async () => {
    const { headers, rows } = await lerPlanilha(arquivo(INVENTARIO_XLSX, 'INVENTARIO.XLSX'));
    const [etanol, tolueno] = analisarImportacao(headers, rows);

    expect(etanol.cmd).toMatchObject({ Nome: 'Etanol', Estoque: 2.5, Validade: '2027-10-31', ClasseReatividade: 5, Controlado: true });
    expect(tolueno.motivos).toEqual(['Classe de reatividade ausente']);
  });

  it('continua lendo CSV e TSV', async () => {
    expect(await lerPlanilha(arquivo('Nome,CAS\nEtanol,64-17-5\n', 'inv.csv')))
      .toEqual({ headers: ['Nome', 'CAS'], rows: [['Etanol', '64-17-5']] });
    expect(await lerPlanilha(arquivo('Nome\tCAS\nEtanol\t64-17-5\n', 'inv.tsv')))
      .toEqual({ headers: ['Nome', 'CAS'], rows: [['Etanol', '64-17-5']] });
  });

  it.each(['inventario.xls', 'inventario.ods', 'inventario'])('recusa %s', async (nome) => {
    await expect(lerPlanilha(arquivo('qualquer', nome))).rejects.toBeInstanceOf(FormatoNaoSuportadoError);
  });

  it('rejeita um .xlsx corrompido', async () => {
    await expect(lerPlanilha(arquivo('não é zip', 'inventario.xlsx'))).rejects.toThrow();
  });
});

describe('tabelaDaAba', () => {
  it('converte data para AAAA-MM-DD pelo dia em UTC', () => {
    const { rows } = tabelaDaAba([['Validade'], [new Date(Date.UTC(2027, 9, 31))]]);
    expect(rows).toEqual([['2027-10-31']]);
  });

  it('devolve tabela vazia para aba sem conteúdo', () => {
    expect(tabelaDaAba([[null, null], []])).toEqual({ headers: [], rows: [] });
  });
});
