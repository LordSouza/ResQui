import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ResumoSeguranca } from '../../src/forms/ResumoSeguranca';

const REAGENTE = {
  id: 'R-00007',
  nome: 'Ácido clorídrico',
  sinonimo: 'Ácido muriático',
  formula: 'HCl',
  cas: '7647-01-0',
  classe: 1,
  estoque: 2.5,
  estoque_min: 1,
  unidade: 'L',
  validade: '2027-03-01',
  validade_status: 'ok',
  local: 'Lab A · Armário 2',
  responsavel: 'Ana Lima',
  controlado: true,
  lote: 'L-22',
  abertura: '2026-01-10',
  pictos: ['corrosion'],
  signal: 'Perigo',
  h: ['H314 — Provoca queimaduras severas'],
  p: ['P280 — Usar luvas de proteção'],
};

// classe 1 × 3 = Proibido, × 4 = Perigo, × 2 = Cuidado (não deve aparecer)
const MATRIZ = {
  entries: [
    { classeA: 1, classeB: 2, nivel: 1 },
    { classeA: 1, classeB: 3, nivel: 3 },
    { classeA: 1, classeB: 4, nivel: 2 },
  ],
  fonte: null,
};

const CONFIG = { razaoSocial: 'Instituição Demo', unidade: 'Campus Central' };

function stubLocalStorage() {
  vi.stubGlobal('localStorage', {
    data: {},
    setItem(k, v) { this.data[k] = String(v); },
    getItem(k) { return this.data[k] ?? null; },
    removeItem(k) { delete this.data[k]; },
    clear() { this.data = {}; },
  });
}

function stubFetch({ matrizOk = true, config = CONFIG } = {}) {
  vi.stubGlobal('fetch', vi.fn(async (url) => {
    const u = String(url);
    if (u.includes('/api/compat/matriz')) {
      return matrizOk
        ? { ok: true, status: 200, json: async () => MATRIZ }
        : { ok: false, status: 500, text: async () => '{"message":"falhou"}' };
    }
    if (u.includes('/api/pgrs-config')) {
      return { ok: true, status: 200, json: async () => config };
    }
    return { ok: true, status: 200, json: async () => ({}) };
  }));
}

function renderCom(reagente = REAGENTE) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ResumoSeguranca reagente={reagente} onClose={vi.fn()} />
    </QueryClientProvider>
  );
}

describe('ResumoSeguranca', () => {
  beforeEach(() => {
    stubLocalStorage();
    stubFetch();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('mostra a identificação e o armazenamento vindos do reagente', async () => {
    renderCom();

    expect(await screen.findByText('Ácido muriático')).toBeInTheDocument();
    expect(screen.getAllByText('7647-01-0').length).toBeGreaterThan(0);
    expect(screen.getByText('HCl')).toBeInTheDocument();
    expect(screen.getByText('Lab A · Armário 2')).toBeInTheDocument();
    expect(screen.getByText('Ana Lima')).toBeInTheDocument();
    expect(screen.getByText('L-22')).toBeInTheDocument();
  });

  it('lista as frases H e P do GHS cadastrado', async () => {
    renderCom();

    expect(await screen.findByText('H314 — Provoca queimaduras severas')).toBeInTheDocument();
    expect(screen.getByText('P280 — Usar luvas de proteção')).toBeInTheDocument();
    expect(screen.getByText('Perigo')).toBeInTheDocument();
  });

  it('avisa quando o reagente não tem classificação GHS', async () => {
    renderCom({ ...REAGENTE, pictos: [], signal: '', h: [], p: [] });

    expect(await screen.findByText(/sem classificação ghs cadastrada/i)).toBeInTheDocument();
    expect(screen.queryByText(/frases de perigo/i)).not.toBeInTheDocument();
  });

  it('lista as incompatibilidades da matriz por nível e omite as de nível 1', async () => {
    renderCom();

    expect(await screen.findByText(/3\. Bases \/ álcalis/)).toBeInTheDocument();
    expect(screen.getByText(/4\. Oxidantes fortes/)).toBeInTheDocument();
    expect(screen.queryByText(/2\. Ácidos orgânicos/)).not.toBeInTheDocument();
  });

  it('mantém o documento quando a matriz não carrega', async () => {
    vi.unstubAllGlobals();
    stubLocalStorage();
    stubFetch({ matrizOk: false });

    renderCom();

    expect(await screen.findByText(/não foi possível carregar a matriz/i)).toBeInTheDocument();
    expect(screen.getByText('Ácido muriático')).toBeInTheDocument();
  });

  it('avisa que não substitui a FISPQ do fabricante', async () => {
    renderCom();

    expect(await screen.findByText(/não é a fispq do produto e não a substitui/i)).toBeInTheDocument();
  });

  it('não afirma dados que o sistema não tem', async () => {
    const { container } = renderCom();
    await screen.findByText('Ácido muriático');

    const texto = container.textContent;
    expect(texto).not.toMatch(/Sigma-Aldrich/i);
    expect(texto).not.toMatch(/0800-707-3333/);
    expect(texto).not.toMatch(/SHA-256/i);
    expect(texto).not.toMatch(/CRQ/);
    expect(texto).not.toMatch(/UN \d{4}/);
    expect(screen.queryByRole('button', { name: /baixar pdf/i })).not.toBeInTheDocument();
  });

  it('usa a instituição da configuração do PGRS quando ela existe', async () => {
    renderCom();

    expect(await screen.findByText(/Instituição Demo · Campus Central/)).toBeInTheDocument();
  });

  // O resumo é aberto por qualquer papel; GET /api/pgrs-config exige a policy Operacao e devolveria 403
  // para quem não tem a policy Operacao. Só o recorte de identificação é aberto.
  it('busca a instituição no endpoint de identificação, não na configuração completa', async () => {
    renderCom();

    await screen.findByText(/Instituição Demo · Campus Central/);
    const urls = fetch.mock.calls.map(c => String(c[0]));
    expect(urls.some(u => u.includes('/api/pgrs-config/identificacao'))).toBe(true);
    expect(urls.some(u => u.endsWith('/api/pgrs-config'))).toBe(false);
  });

  it('omite a instituição quando o PGRS não está configurado', async () => {
    vi.unstubAllGlobals();
    stubLocalStorage();
    stubFetch({ config: {} });

    renderCom();

    await screen.findByText('Ácido muriático');
    expect(screen.queryByText(/Instituição Demo/)).not.toBeInTheDocument();
  });
});
