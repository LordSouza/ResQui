import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { pgrsTs, exportCsv, quantidadesResiduos, formatarQuantidade, formatarQuantidadeDocumento, decimalDocumento, dataBrasileira } from '../../src/utils';

// --- pgrsTs ---
describe('pgrsTs', () => {
  it('returns a string in YYYY-MM-DD HH:MM:SS format', () => {
    const ts = pgrsTs();
    expect(ts).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });

  it('returns a non-empty string each call', () => {
    expect(pgrsTs().length).toBeGreaterThan(0);
  });
});

// --- exportCsv ---
describe('exportCsv', () => {
  let mockAnchor;

  beforeEach(() => {
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();
    mockAnchor = { href: '', download: '', click: vi.fn() };
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'a') return mockAnchor;
      return document.createElement.wrappedMethod
        ? document.createElement.wrappedMethod(tag)
        : Object.create(HTMLElement.prototype);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sets the filename as the download attribute', () => {
    exportCsv([['A', 'B']], 'relatorio.csv');
    expect(mockAnchor.download).toBe('relatorio.csv');
  });

  it('calls click() on the anchor to trigger download', () => {
    exportCsv([['A', 'B']], 'out.csv');
    expect(mockAnchor.click).toHaveBeenCalledOnce();
  });

  it('passes a Blob to URL.createObjectURL', () => {
    exportCsv([['col1', 'col2'], ['v1', 'v2']], 'test.csv');
    const blobArg = global.URL.createObjectURL.mock.calls[0][0];
    expect(blobArg).toBeInstanceOf(Blob);
  });

  it('sets href to the result of URL.createObjectURL', () => {
    exportCsv([['x']], 'x.csv');
    expect(mockAnchor.href).toBe('blob:mock-url');
  });
});

// --- quantidadesResiduos ---
describe('quantidadesResiduos', () => {
  const r = (volume, unidade) => ({ volume, unidade });

  it('converte volume para litros sem tocar em quilos', () => {
    expect(quantidadesResiduos([r(2, 'L')])).toEqual({ litros: 2, quilos: 0 });
    expect(quantidadesResiduos([r(500, 'mL')])).toEqual({ litros: 0.5, quilos: 0 });
    expect(quantidadesResiduos([r(1, 'm³')])).toEqual({ litros: 1000, quilos: 0 });
  });

  it('converte massa para quilos sem tocar em litros', () => {
    expect(quantidadesResiduos([r(3, 'kg')])).toEqual({ litros: 0, quilos: 3 });
    expect(quantidadesResiduos([r(250, 'g')])).toEqual({ litros: 0, quilos: 0.25 });
  });

  it('não mistura as duas dimensões', () => {
    expect(quantidadesResiduos([r(5, 'L'), r(2, 'kg'), r(250, 'mL')]))
      .toEqual({ litros: 5.25, quilos: 2 });
  });

  it('ignora unidade fora do conjunto e entrada inválida', () => {
    expect(quantidadesResiduos([r(5, 'L'), r(999, 'barril'), r(7, 'm3')]))
      .toEqual({ litros: 5, quilos: 0 });
    expect(quantidadesResiduos([r(undefined, 'L'), r(null, 'kg')]))
      .toEqual({ litros: 0, quilos: 0 });
    expect(quantidadesResiduos([])).toEqual({ litros: 0, quilos: 0 });
    expect(quantidadesResiduos(undefined)).toEqual({ litros: 0, quilos: 0 });
  });
});

// --- formatarQuantidade ---
describe('formatarQuantidade', () => {
  it('mostra as duas dimensões com duas casas', () => {
    expect(formatarQuantidade({ litros: 30, quilos: 12.5 })).toBe('30.00 L · 12.50 kg');
  });

  it('omite a dimensão zerada', () => {
    expect(formatarQuantidade({ litros: 30, quilos: 0 })).toBe('30.00 L');
    expect(formatarQuantidade({ litros: 0, quilos: 2 })).toBe('2.00 kg');
  });

  it('sem quantidade, devolve travessão', () => {
    expect(formatarQuantidade({ litros: 0, quilos: 0 })).toBe('—');
    expect(formatarQuantidade()).toBe('—');
  });

  it('aceita outro número de casas', () => {
    expect(formatarQuantidade({ litros: 1.234, quilos: 0 }, 1)).toBe('1.2 L');
  });
});

describe('formatarQuantidadeDocumento', () => {
  it('usa 3 casas e vírgula decimal, como QuantidadeResiduos.Formatar do PDF', () => {
    expect(formatarQuantidadeDocumento({ litros: 4, quilos: 2.5 })).toBe('4,000 L · 2,500 kg');
  });

  it('omite dimensão zerada e devolve travessão quando ambas são zero', () => {
    expect(formatarQuantidadeDocumento({ litros: 0, quilos: 1234.5 })).toBe('1234,500 kg');
    expect(formatarQuantidadeDocumento({ litros: 0, quilos: 0 })).toBe('—');
  });
});

describe('decimalDocumento', () => {
  it('fixa as casas com vírgula decimal e sem separador de milhar', () => {
    expect(decimalDocumento(4, 2)).toBe('4,00');
    expect(decimalDocumento(1234.5, 2)).toBe('1234,50');
  });
});

describe('dataBrasileira', () => {
  it('converte yyyy-MM-dd em dd/MM/yyyy sem passar por Date, então sem deslocamento de fuso', () => {
    expect(dataBrasileira('2026-08-01')).toBe('01/08/2026');
    expect(dataBrasileira('2026-07-24T00:00:00Z')).toBe('24/07/2026');
  });

  it('devolve travessão para valor ausente', () => {
    expect(dataBrasileira(null)).toBe('—');
    expect(dataBrasileira('')).toBe('—');
  });
});
