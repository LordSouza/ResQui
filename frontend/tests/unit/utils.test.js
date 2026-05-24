import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { pgrsTs, exportCsv, logAudit } from '../../src/utils';
import { AUDITORIA } from '../../src/data';

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

// --- logAudit ---
describe('logAudit', () => {
  let snapshotLength;

  beforeEach(() => {
    snapshotLength = AUDITORIA.length;
  });

  afterEach(() => {
    while (AUDITORIA.length > snapshotLength) {
      AUDITORIA.shift();
    }
  });

  it('inserts a new entry at index 0', () => {
    logAudit('item.test', 'detail text', 'Lab-201', 'high');
    expect(AUDITORIA.length).toBe(snapshotLength + 1);
    expect(AUDITORIA[0].what).toBe('item.test');
  });

  it('sets all entry fields correctly', () => {
    logAudit('item.test', 'detail text', 'Lab-201', 'high');
    const entry = AUDITORIA[0];
    expect(entry.detail).toBe('detail text');
    expect(entry.where).toBe('Lab-201');
    expect(entry.risk).toBe('high');
    expect(entry.who).toBe('Lucas Souza');
    expect(entry.ts).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });

  it('defaults where to dash when omitted', () => {
    logAudit('item.test', 'detail');
    expect(AUDITORIA[0].where).toBe('-');
  });

  it('defaults risk to low when omitted', () => {
    logAudit('item.test', 'detail');
    expect(AUDITORIA[0].risk).toBe('low');
  });
});
