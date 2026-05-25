import { useState } from 'react';
import { Icon, Badge, riscoBadge } from '../components';
import { AUDITORIA } from '../data';
import { pgrsTs } from '../utils';
import Modal from './Modal';
import { useCriarResiduo } from '../residuos/useCriarResiduo';
import { useAtualizarResiduo } from '../residuos/useAtualizarResiduo';
import { useLaboratorios } from '../laboratorios/useLaboratorios';
import { useCriarMtr } from '../mtrs/useCriarMtr';
import { useResíduos } from '../residuos/useResíduos';

// ---------- Novo Resíduo ----------
export function FormNovoResiduo({ onClose, dispatch }) {
  const [submitting, setSubmitting] = useState(false);
  const [f, setF] = useState({
    tipo: 'Solventes orgânicos não-halogenados',
    volume: '', unidade: 'L',
    gerador: 'Lab-201', composicao: '', risco: 'medio',
    embalagem: 'Bombona 5L', neutralizado: false, obs: '',
  });
  const upd = (k, v) => setF(s => ({...s, [k]: v}));

  const submit = () => {
    if (submitting) return;
    if (!f.volume || !f.composicao) { alert('Volume e composição são obrigatórios.'); return; }
    setSubmitting(true);
    const last = RESIDUOS.map(r => parseInt(r.id.replace('W-', ''))).reduce((a, b) => Math.max(a, b), 0);
    const id = 'W-' + String(last + 1).padStart(4, '0');
    const novo = {
      id, tipo: f.tipo, volume: Number(f.volume), unidade: f.unidade,
      gerador: f.gerador, composicao: f.composicao, risco: f.risco,
      status: 'aguardando-coleta', registrado: new Date().toISOString().slice(0, 10),
      mtr: null,
    };
    RESIDUOS.unshift(novo);
    AUDITORIA.unshift({
      ts: pgrsTs(),
      who: 'Lucas Souza', what: 'waste.create', where: f.gerador,
      detail: `Registrou resíduo ${id} — ${f.tipo}, ${f.volume} ${f.unidade}`, risk: 'low',
    });
    dispatch({type: 'refresh', flashId: id});
    onClose();
  };

  return (
    <Modal title="Registrar resíduo" sub="Identificação na fonte conforme PNRS · Lei 12.305/2010"
      onClose={onClose} width={620}
      footer={<>
        <button type="button" className="btn btn-sm" onClick={onClose}>Cancelar</button>
        <button type="button" className="btn btn-primary btn-sm" onClick={submit} disabled={submitting}>Registrar resíduo</button>
      </>}>
      <div className="form-row">
        <div className="field"><label htmlFor="residuo-tipo">Tipo de resíduo *</label>
          <select id="residuo-tipo" value={f.tipo} onChange={e => upd('tipo', e.target.value)}>
            <option>Solventes orgânicos não-halogenados</option>
            <option>Solventes halogenados</option>
            <option>Ácidos inorgânicos</option>
            <option>Ácidos orgânicos</option>
            <option>Bases inorgânicas</option>
            <option>Metais pesados</option>
            <option>Oxidantes</option>
            <option>Compostos cianetos</option>
            <option>Vidraria contaminada</option>
            <option>Material biológico contaminado</option>
          </select>
        </div>
        <div className="field"><label htmlFor="residuo-risco">Risco</label>
          <select id="residuo-risco" value={f.risco} onChange={e => upd('risco', e.target.value)}>
            <option value="baixo">Baixo</option>
            <option value="medio">Médio</option>
            <option value="alto">Alto</option>
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="field"><label htmlFor="residuo-volume">Volume / massa *</label>
          <div style={{display: 'flex', gap: 6}}>
            <input id="residuo-volume" style={{flex: 1}} type="number" step="0.1" value={f.volume} onChange={e => upd('volume', e.target.value)} aria-label="Volume"/>
            <select style={{width: 80}} value={f.unidade} onChange={e => upd('unidade', e.target.value)} aria-label="Unidade de volume">
              <option>L</option><option>mL</option><option>kg</option><option>g</option>
            </select>
          </div>
        </div>
        <div className="field"><label htmlFor="residuo-embalagem">Embalagem</label>
          <select id="residuo-embalagem" value={f.embalagem} onChange={e => upd('embalagem', e.target.value)}>
            <option>Bombona 5L</option><option>Bombona 20L</option>
            <option>Frasco vidro 1L</option><option>Pote 1kg</option>
            <option>Big-bag</option><option>Tambor 50L</option>
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="field"><label htmlFor="residuo-gerador">Gerador (laboratório)</label>
          <select id="residuo-gerador" value={f.gerador} onChange={e => upd('gerador', e.target.value)}>
            <option>Lab-201</option><option>Lab-203</option>
            <option>Lab-205</option><option>Lab-209</option>
            <option>Lab-211</option>
          </select>
        </div>
        <div className="field" style={{display: 'flex', alignItems: 'flex-end'}}>
          <label htmlFor="residuo-neutralizado" style={{display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer'}}>
            <input id="residuo-neutralizado" type="checkbox" aria-label="Já passou por neutralização / tratamento prévio" checked={f.neutralizado} onChange={e => upd('neutralizado', e.target.checked)}/>
            Já passou por neutralização / tratamento prévio
          </label>
        </div>
      </div>

      <div className="form-row full">
        <div className="field"><label htmlFor="residuo-composicao">Composição declarada *</label>
          <textarea id="residuo-composicao" aria-label="Composição declarada" rows={3} value={f.composicao} onChange={e => upd('composicao', e.target.value)}
            placeholder="Ex: 60% acetona + 30% etanol + traços de HCl, pH 6"/>
        </div>
      </div>

      <div className="form-row full">
        <div className="field"><label htmlFor="residuo-obs">Observações</label>
          <textarea id="residuo-obs" aria-label="Observações" rows={2} value={f.obs} onChange={e => upd('obs', e.target.value)}
            placeholder="Procedimento que gerou, riscos adicionais, etc."/>
        </div>
      </div>

      <div className="residuo-warning-banner">
        <Icon name="warning" size={14}/>
        <span>Após cadastrar, o sistema rotula automaticamente o recipiente e move para "aguardando coleta". Verifique a compatibilidade antes de armazenar.</span>
      </div>
    </Modal>
  );
}

// ---------- Novo Pré-MTR ----------
function mtrReducer(state, action) {
  switch (action.type) {
    case 'toggle':
      return { ...state, selected: state.selected.includes(action.id) ? state.selected.filter(x => x !== action.id) : [...state.selected, action.id] };
    case 'setTransp': return { ...state, transp: action.value };
    case 'setDest':   return { ...state, dest: action.value };
    case 'setCodigo': return { ...state, codigo: action.value };
    case 'submit':    return { ...state, submitting: true };
    default: return state;
  }
}

export function FormNovoMtr({ onClose, dispatch }) {
  const [mtr, mtrDispatch] = useReducer(mtrReducer, null, () => {
    const aguardando = RESIDUOS.filter(r => r.status === 'aguardando-coleta');
    return { submitting: false, selected: aguardando.map(r => r.id), transp: 'EcoLog Transportes', dest: 'EcoQuímica SA', codigo: 'A099' };
  });
  const { submitting, selected, transp, dest, codigo } = mtr;
  const aguardando = RESIDUOS.filter(r => r.status === 'aguardando-coleta');

  const toggle = (id) => mtrDispatch({ type: 'toggle', id });
  const massa = selected.reduce((s, id) => {
    const r = RESIDUOS.find(x => x.id === id);
    const toKg = { kg: 1, g: 0.001, L: 1.0, mL: 0.001 };
    return s + (r ? r.volume * (toKg[r.unidade] ?? 1.0) : 0);
  }, 0);

  const submit = () => {
    if (submitting) return;
    if (selected.length === 0) { alert('Selecione ao menos um resíduo.'); return; }
    mtrDispatch({ type: 'submit' });
    const last = MTRS.map(m => parseInt(m.id.replace('MTR-2025-', ''))).reduce((a, b) => Math.max(a, b), 0);
    const id = 'MTR-2025-' + String(last + 1).padStart(4, '0');
    const novo = {
      id, emissao: new Date().toISOString().slice(0, 10),
      status: 'rascunho', transportador: transp, destinador: dest,
      residuos: selected, massa: Number(massa.toFixed(1)), codigo_ibama: codigo,
    };
    MTRS.unshift(novo);
    selected.forEach(rid => {
      const r = RESIDUOS.find(x => x.id === rid);
      if (r) { r.mtr = id; r.status = 'em-coleta'; }
    });
    AUDITORIA.unshift({
      ts: pgrsTs(),
      who: 'Lucas Souza', what: 'mtr.draft', where: '-',
      detail: `Criou pré-MTR ${id} (${selected.length} resíduos · ${massa.toFixed(1)} kg)`, risk: 'low',
    });
    dispatch({type: 'refresh', flashId: id});
    onClose();
  };

  return (
    <Modal title="Novo Pré-MTR" sub="Consolida resíduos para transporte e destinação · base ANTT 5947/21"
      onClose={onClose} width={680}
      footer={<>
        <button type="button" className="btn btn-sm" onClick={onClose}>Cancelar</button>
        <button type="button" className="btn btn-primary btn-sm" onClick={submit} disabled={submitting}>Criar Pré-MTR ({selected.length})</button>
      </>}>
      <div className="form-row">
        <div className="field"><label htmlFor="mtr-transportador">Transportador</label>
          <select id="mtr-transportador" value={transp} onChange={e => mtrDispatch({ type: 'setTransp', value: e.target.value })}>
            <option>EcoLog Transportes</option><option>CleanWaste</option>
          </select>
        </div>
        <div className="field"><label htmlFor="mtr-destinador">Destinador</label>
          <select id="mtr-destinador" value={dest} onChange={e => mtrDispatch({ type: 'setDest', value: e.target.value })}>
            <option>EcoQuímica SA</option><option>Resitec Ambiental</option>
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="field"><label htmlFor="mtr-codigo-ibama">Código IBAMA</label>
          <select id="mtr-codigo-ibama" value={codigo} onChange={e => mtrDispatch({ type: 'setCodigo', value: e.target.value })}>
            <option value="A099">A099: Resíduos químicos diversos</option>
            <option value="A002">A002: Soluções ácidas</option>
            <option value="A007">A007: Solventes halogenados</option>
            <option value="A004">A004: Metais pesados</option>
          </select>
        </div>
        <div className="field"><label htmlFor="mtr-massa-total">Massa total estimada</label>
          <input id="mtr-massa-total" aria-label="Massa total estimada" value={massa.toFixed(1) + ' kg'} readOnly/>
        </div>
      </div>

      <fieldset className="field mtr-residuos-fieldset" style={{marginTop: 8}}>
        <legend className="mtr-residuos-legend">Selecione resíduos a consolidar ({selected.length} / {aguardando.length})</legend>
        <div style={{border: '1px solid var(--border)', borderRadius: 'var(--radius)', maxHeight: 220, overflow: 'auto'}}>
          {aguardando.map(r => (
            <label key={r.id} className="mtr-residuo-row"
              style={{background: selected.includes(r.id) ? 'var(--accent-soft)' : 'transparent'}}>
              <input type="checkbox" checked={selected.includes(r.id)} onChange={() => toggle(r.id)} aria-label={`Selecionar resíduo ${r.id}`}/>
              <span className="mono">{r.id}</span>
              <span>{r.tipo} · <span className="muted">{r.composicao}</span></span>
              <span className="mono right">{r.volume} {r.unidade}</span>
              <span>{riscoBadge(r.risco)}</span>
            </label>
          ))}
        </div>
      </fieldset>
    </Modal>
  );
}

// ---------- Preview do PDF do MTR (fluxo simulado) ----------
const mtrTh = { padding: '6px 8px', border: '1px solid #bbb', textAlign: 'left', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 };
const mtrTd = { padding: '5px 8px', border: '1px solid #ddd', verticalAlign: 'top' };

function SectionMtr({ num, title, children }) {
  return (
    <div style={{marginTop: 14}}>
      <div className="mtr-section-header">
        <span style={{fontFamily: 'Courier, monospace', opacity: 0.7}}>§{num}</span>
        <span>{title}</span>
      </div>
      <div style={{padding: '6px 10px', border: '1px solid #ddd', borderTop: 0}}>
        {children}
      </div>
    </div>
  );
}

function RowMtr({ label, value, mono }) {
  return (
    <div style={{display: 'grid', gridTemplateColumns: '160px 1fr', padding: '3px 0', fontSize: 12, gap: 8}}>
      <div style={{color: '#666', textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 12, paddingTop: 1}}>{label}</div>
      <div style={{fontFamily: mono ? 'Courier, monospace' : 'inherit'}}>{value}</div>
    </div>
  );
}

export function FormPreviewMtrPdf({ onClose, dispatch }) {
  return (
    <Modal title="Pré-visualização · MTR-2025-1143" sub="Documento gerado conforme Res. ANTT 5947/21"
      onClose={onClose} width={920}
      footer={<>
        <button type="button" className="btn btn-sm" onClick={onClose}>Fechar</button>
        <button type="button" className="btn btn-sm" onClick={() => {
          const original = document.querySelector('.mtr-sheet');
          if (!original) { window.print(); return; }
          let portal = document.getElementById('print-portal');
          if (portal) portal.remove();
          portal = document.createElement('div');
          portal.id = 'print-portal';
          portal.appendChild(original.cloneNode(true));
          document.body.appendChild(portal);
          // injeta @page A4 que sobrescreve o A6 do rótulo
          let pageStyle = document.getElementById('mtr-print-page');
          if (!pageStyle) {
            pageStyle = document.createElement('style');
            pageStyle.id = 'mtr-print-page';
            pageStyle.textContent = '@media print { @page { size: A4 portrait; margin: 10mm; } }';
            document.head.appendChild(pageStyle);
          }
          document.body.classList.add('printing-mtr');
          const cleanup = () => {
            document.body.classList.remove('printing-mtr');
            const p = document.getElementById('print-portal');
            if (p) p.remove();
            const s = document.getElementById('mtr-print-page');
            if (s) s.remove();
            window.removeEventListener('afterprint', cleanup);
          };
          window.addEventListener('afterprint', cleanup);
          setTimeout(() => { window.print(); setTimeout(cleanup, 1000); }, 50);
        }}>
          <Icon name="clipboard" size={12}/> Imprimir
        </button>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => {
          AUDITORIA.unshift({
            ts: pgrsTs(),
            who: 'Lucas Souza',
            what: 'mtr.preview.download',
            where: '-',
            detail: 'Baixou pré-visualização MTR-2025-1143.pdf',
            risk: 'low',
          });
          alert('Download iniciado: MTR-2025-1143.pdf');
        }}>
          <Icon name="download" size={12}/> Baixar PDF
        </button>
      </>}>
      <div className="mtr-preview-bg">
        <div className="mtr-sheet mtr-sheet-doc">
          {/* Cabeçalho oficial */}
          <div style={{display: 'grid', gridTemplateColumns: '50px 1fr 90px', gap: 14, alignItems: 'center', borderBottom: '2px solid #111', paddingBottom: 12}}>
            <div className="mtr-header-logo">
              IBAMA
            </div>
            <div style={{textAlign: 'center'}}>
              <div style={{fontSize: 12, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#444'}}>
                Ministério do Meio Ambiente · IBAMA
              </div>
              <div style={{fontSize: 13, fontWeight: 700, marginTop: 3}}>
                MANIFESTO DE TRANSPORTE DE RESÍDUOS: MTR
              </div>
              <div style={{fontSize: 12, color: '#444', marginTop: 2}}>
                Sistema Nacional de Informações sobre a Gestão dos Resíduos Sólidos · SINIR
              </div>
            </div>
            <div style={{textAlign: 'right'}}>
              <div style={{fontSize: 12, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em'}}>Nº do manifesto</div>
              <div style={{fontFamily: 'Courier, monospace', fontSize: 13, fontWeight: 700, marginTop: 2}}>2025-1143</div>
              <div style={{fontSize: 12, color: '#666', marginTop: 4}}>via 1 de 4</div>
            </div>
          </div>

          {/* Barras de status */}
          <div className="mtr-status-bar">
            Documento provisório · não válido para transporte · pendente validação SINIR
          </div>

          {/* Seção 1 - Gerador */}
          <SectionMtr num="1" title="IDENTIFICAÇÃO DO GERADOR">
            <RowMtr label="Razão social" value="UNIVERSIDADE FEDERAL DE ITAJUBÁ — UNIFEI"/>
            <RowMtr label="Unidade geradora" value="Instituto de Matemática e Computação · Lab de Química Geral"/>
            <RowMtr label="CNPJ" value="12.345.678/0001-95" mono/>
            <RowMtr label="Endereço" value="Rua Demonstração, 100 · Cidade Demo/UF"/>
            <RowMtr label="Responsável técnico" value="Profa. Dra. Ana Lúcia Lima · CRQ 00-00000"/>
          </SectionMtr>

          {/* Seção 2 - Transportador */}
          <SectionMtr num="2" title="TRANSPORTADOR">
            <RowMtr label="Razão social" value="ECOLOG TRANSPORTES DE RESÍDUOS LTDA"/>
            <RowMtr label="CNPJ" value="11.222.333/0001-44" mono/>
            <RowMtr label="Licença ambiental" value="LO-IBAMA 2024/0892 · válida até 12/2026" mono/>
            <RowMtr label="Veículo · placa" value="CAMINHÃO BAÚ ISOTÉRMICO · RTB-4521" mono/>
            <RowMtr label="Condutor (MOPP)" value="José Antônio da Silva · CNH 04582319003"/>
          </SectionMtr>

          {/* Seção 3 - Destinador */}
          <SectionMtr num="3" title="DESTINADOR">
            <RowMtr label="Razão social" value="ECOQUÍMICA SA · TRATAMENTO DE RESÍDUOS INDUSTRIAIS"/>
            <RowMtr label="CNPJ" value="55.666.777/0001-22" mono/>
            <RowMtr label="Tecnologia" value="T34 — Incineração com lavagem de gases · Cap. 2,5 t/dia"/>
            <RowMtr label="Licença operação" value="LO-FEAM 2023/4471 · válida até 08/2027" mono/>
          </SectionMtr>

          {/* Seção 4 - Resíduos */}
          <SectionMtr num="4" title="RELAÇÃO DE RESÍDUOS TRANSPORTADOS">
            <table style={{width: '100%', borderCollapse: 'collapse', fontSize: 12, marginTop: 6}}>
              <thead>
                <tr style={{background: '#f0f0f0'}}>
                  <th style={mtrTh}>ID interno</th>
                  <th style={mtrTh}>Descrição</th>
                  <th style={mtrTh}>Cód. IBAMA</th>
                  <th style={mtrTh}>Classe ABNT</th>
                  <th style={{...mtrTh, textAlign: 'right'}}>Massa (kg)</th>
                  <th style={mtrTh}>Embalagem</th>
                </tr>
              </thead>
              <tbody>
                <tr><td style={mtrTd}>W-0451</td><td style={mtrTd}>Solventes orgânicos halogenados (clorofórmio + diclorometano)</td><td style={mtrTd}>A007</td><td style={mtrTd}>F003</td><td style={{...mtrTd, textAlign: 'right', fontFamily: 'Courier, monospace'}}>5,10</td><td style={mtrTd}>Bombona PEAD 5L</td></tr>
                <tr><td style={mtrTd}>W-0452</td><td style={mtrTd}>Soluções ácidas inorgânicas (HCl + H₂SO₄ diluído)</td><td style={mtrTd}>A002</td><td style={mtrTd}>D002</td><td style={{...mtrTd, textAlign: 'right', fontFamily: 'Courier, monospace'}}>2,40</td><td style={mtrTd}>Bombona PEAD 5L</td></tr>
                <tr><td style={mtrTd}>W-0454</td><td style={mtrTd}>Sais de metais pesados (Pb, Cd, Cr)</td><td style={mtrTd}>A099</td><td style={mtrTd}>D008</td><td style={{...mtrTd, textAlign: 'right', fontFamily: 'Courier, monospace'}}>0,80</td><td style={mtrTd}>Pote vidro 1kg</td></tr>
                <tr style={{borderTop: '2px solid #111', fontWeight: 700, background: '#fafafa'}}>
                  <td style={mtrTd} colSpan={4}>TOTAL · 3 itens</td>
                  <td style={{...mtrTd, textAlign: 'right', fontFamily: 'Courier, monospace'}}>8,30</td>
                  <td style={mtrTd}>-</td>
                </tr>
              </tbody>
            </table>
          </SectionMtr>

          {/* Seção 5 - Observações */}
          <SectionMtr num="5" title="OBSERVAÇÕES">
            <div style={{fontSize: 12, lineHeight: 1.55, padding: '4px 0'}}>
              Transporte conforme classificação ONU 3264 e 3082. Acompanhar com FISPQ de cada item.
              Veículo sinalizado com painel de segurança e rótulo de risco classes 6.1 e 8. Manter
              kit de emergência (absorvente + neutralizante) durante todo o trajeto. Rota aprovada:
              Itajubá/MG → BR-459 → Pouso Alegre/MG (destino).
            </div>
          </SectionMtr>

          {/* Seção 6 - Assinaturas */}
          <div style={{marginTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, fontSize: 12}}>
            {['Gerador', 'Transportador', 'Destinador'].map(t => (
              <div key={t}>
                <div style={{borderTop: '1px solid #111', paddingTop: 4, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#444'}}>
                  Assinatura · {t}
                </div>
                <div style={{marginTop: 22, height: 1, background: '#111'}}/>
                <div style={{fontSize: 12, color: '#666', textAlign: 'center', marginTop: 4}}>Nome legível · data · carimbo</div>
              </div>
            ))}
          </div>

          {/* Rodapé com código de barras + hash */}
          <div style={{marginTop: 22, paddingTop: 12, borderTop: '1px solid #111', display: 'grid', gridTemplateColumns: '1fr auto', gap: 14, alignItems: 'flex-end'}}>
            <div style={{fontSize: 12, color: '#444', lineHeight: 1.5}}>
              Gerado em 22/11/2025 14:32:18 (GMT-3) · ResQui v1.4.2 · UNIFEI-IMC<br/>
              Hash de validação: <span style={{fontFamily: 'Courier, monospace'}}>SHA-256 · 7f3a91b2c4d8e6f5a1029384756bcdef</span><br/>
              Para validar acesse <span style={{fontFamily: 'Courier, monospace'}}>sinir.gov.br/validar</span> e informe o nº do manifesto.
            </div>
            <div style={{textAlign: 'right'}}>
              <div style={{display: 'flex', gap: 1, marginBottom: 3, height: 36, alignItems: 'center'}}>
                {'113211322112213121132132212311211322'.split('').map((w, i) => (
                  <div key={i} style={{width: Number(w), height: 36, background: '#111'}}/>
                ))}
              </div>
              <div style={{fontFamily: 'Courier, monospace', fontSize: 12, letterSpacing: '0.05em'}}>
                MTR-2025-1143-1143
              </div>
            </div>
          </div>
        </div>

        <div style={{textAlign: 'center', marginTop: 12, fontSize: 12, color: 'var(--text-3)'}}>
          Página 1 de 1 · A4 retrato · 96 dpi
        </div>
      </div>
    </Modal>
  );
}

// ---------- Configurar PGRS (Lei 12.305/10 art. 21) ----------
const pgrsHint = { fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5, marginBottom: 14, padding: '8px 10px', background: 'var(--surface-2)', borderRadius: 'var(--radius)', borderLeft: '3px solid var(--accent)' };
const pgrsSub = { fontSize: 12, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', marginBottom: 8, marginTop: 4 };
const pgrsCheck = { display: 'flex', gap: 8, alignItems: 'center', fontSize: 12.5, padding: '4px 0', cursor: 'pointer' };

export function FormConfigurarPgrs({ onClose, dispatch }) {
  const [tab, setTab] = useState('identificacao');
  const [cfg, setCfg] = useState(() => ({
    // Identificação
    razao_social: 'Universidade Federal de Itajubá — UNIFEI',
    cnpj: '12.345.678/0001-95',
    endereco: 'Rua Demonstração, 100 · Cidade Demo/UF',
    unidade: 'Instituto de Matemática e Computação · IMC',
    resp_tecnico: 'Profa. Dra. Ana Lúcia Lima',
    resp_crq: 'CRQ 00-00000',
    resp_email: 'ana.lima@instituto.example',
    resp_tel: '(00) 0000-0000',
    area_m2: 1840,
    pesquisadores: 87,
    // Escopo
    labs: ['Lab-201', 'Lab-203', 'Lab-205', 'Lab-209', 'Lab-211'],
    tipos_residuo: { quimicos: true, biologicos: false, perfurocortantes: true, eletronicos: true, comum: true },
    vigencia: 'anual',
    // Metas
    hierarquia: { naoGeracao: true, reducao: true, reutilizacao: true, reciclagem: true, tratamento: true, destinacao: true },
    meta_reducao_pct: 15,
    meta_reciclagem_pct: 40,
    meta_destinacao_pct: 100,
    transportador_padrao: 'EcoLog Transportes de Resíduos Ltda',
    destinador_padrao: 'EcoQuímica SA — Incineração T34',
    // Aprovações
    workflow: 'Resp. técnico → Coordenação IMC → Pró-Reitoria de Administração',
    orgao_destino: 'FEAM-MG',
    publicar_sinir: true,
    publicar_sisema: true,
    revisao_proxima: '2026-11-30',
  }));

  const set = (k, v) => setCfg(c => ({ ...c, [k]: v }));
  const toggle = (group, k) => setCfg(c => ({ ...c, [group]: { ...c[group], [k]: !c[group][k] } }));
  const toggleLab = (lab) => setCfg(c => ({ ...c, labs: c.labs.includes(lab) ? c.labs.filter(l => l !== lab) : [...c.labs, lab] }));

  const save = () => {
    AUDITORIA.unshift({
      ts: pgrsTs(),
      who: 'Lucas Souza', what: 'pgrs.config', where: '-',
      detail: `Atualizou configuração do PGRS (${cfg.labs.length} laboratórios, vigência ${cfg.vigencia}, meta redução ${cfg.meta_reducao_pct}%)`,
      risk: 'low',
    });
    dispatch({ type: 'refresh' });
    onClose();
  };

  const labsTodos = ['Lab-201', 'Lab-203', 'Lab-205', 'Lab-209', 'Lab-211'];

  return (
    <Modal title="Configurar PGRS" sub="Plano de Gerenciamento de Resíduos Sólidos · Lei 12.305/10 art. 21 · parâmetros institucionais"
      onClose={onClose} width={720}
      footer={<>
        <button type="button" className="btn btn-sm" onClick={onClose}>Cancelar</button>
        <button type="button" className="btn btn-primary btn-sm" onClick={save}><Icon name="check" size={12}/> Salvar configuração</button>
      </>}>
      <div className="tabs">
        <button type="button" className={`tab ${tab === 'identificacao' ? 'active' : ''}`} onClick={() => setTab('identificacao')}>Identificação</button>
        <button type="button" className={`tab ${tab === 'escopo' ? 'active' : ''}`} onClick={() => setTab('escopo')}>Escopo</button>
        <button type="button" className={`tab ${tab === 'metas' ? 'active' : ''}`} onClick={() => setTab('metas')}>Metas e hierarquia</button>
        <button type="button" className={`tab ${tab === 'aprovacoes' ? 'active' : ''}`} onClick={() => setTab('aprovacoes')}>Aprovações</button>
      </div>

      {tab === 'identificacao' && (
        <div>
          <div style={pgrsHint}>Dados do empreendimento exigidos no inciso I do art. 21; preenchidos automaticamente nos PGRS gerados.</div>
          <div className="form-row full">
            <div className="field"><label htmlFor="pgrs-razao-social">Razão social</label>
              <input id="pgrs-razao-social" aria-label="Razão social" value={cfg.razao_social} onChange={e => set('razao_social', e.target.value)}/></div>
          </div>
          <div className="form-row">
            <div className="field"><label htmlFor="pgrs-cnpj">CNPJ</label>
              <input id="pgrs-cnpj" aria-label="CNPJ" value={cfg.cnpj} onChange={e => set('cnpj', e.target.value)} style={{fontFamily: 'var(--mono)'}}/></div>
            <div className="field"><label htmlFor="pgrs-unidade">Unidade geradora</label>
              <input id="pgrs-unidade" aria-label="Unidade geradora" value={cfg.unidade} onChange={e => set('unidade', e.target.value)}/></div>
          </div>
          <div className="form-row full">
            <div className="field"><label htmlFor="pgrs-endereco">Endereço</label>
              <input id="pgrs-endereco" aria-label="Endereço" value={cfg.endereco} onChange={e => set('endereco', e.target.value)}/></div>
          </div>
          <div style={pgrsSub}>Responsável técnico</div>
          <div className="form-row">
            <div className="field"><label htmlFor="pgrs-resp-nome">Nome</label>
              <input id="pgrs-resp-nome" aria-label="Nome do responsável técnico" value={cfg.resp_tecnico} onChange={e => set('resp_tecnico', e.target.value)}/></div>
            <div className="field"><label htmlFor="pgrs-resp-crq">Registro CRQ</label>
              <input id="pgrs-resp-crq" aria-label="Registro CRQ" value={cfg.resp_crq} onChange={e => set('resp_crq', e.target.value)} style={{fontFamily: 'var(--mono)'}}/></div>
          </div>
          <div className="form-row">
            <div className="field"><label htmlFor="pgrs-resp-email">E-mail</label>
              <input id="pgrs-resp-email" aria-label="E-mail do responsável técnico" value={cfg.resp_email} onChange={e => set('resp_email', e.target.value)} style={{fontFamily: 'var(--mono)'}}/></div>
            <div className="field"><label htmlFor="pgrs-resp-tel">Telefone</label>
              <input id="pgrs-resp-tel" aria-label="Telefone do responsável técnico" value={cfg.resp_tel} onChange={e => set('resp_tel', e.target.value)} style={{fontFamily: 'var(--mono)'}}/></div>
          </div>
          <div className="form-row">
            <div className="field"><label htmlFor="pgrs-area-m2">Área construída (m²)</label>
              <input id="pgrs-area-m2" aria-label="Área construída em m²" type="number" value={cfg.area_m2} onChange={e => set('area_m2', +e.target.value)} style={{fontFamily: 'var(--mono)'}}/></div>
            <div className="field"><label htmlFor="pgrs-pesquisadores">Nº de pesquisadores/usuários</label>
              <input id="pgrs-pesquisadores" aria-label="Número de pesquisadores e usuários" type="number" value={cfg.pesquisadores} onChange={e => set('pesquisadores', +e.target.value)} style={{fontFamily: 'var(--mono)'}}/></div>
          </div>
        </div>
      )}

      {tab === 'escopo' && (
        <div>
          <div style={pgrsHint}>Define quais laboratórios e tipos de resíduo estão cobertos pelo plano (incisos II e III).</div>
          <div style={pgrsSub}>Laboratórios incluídos</div>
          <div style={{display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14}}>
            {labsTodos.map(lab => {
              const ativo = cfg.labs.includes(lab);
              const labInfo = LABORATORIOS?.find(l => l.id === lab);
              return (
                <button type="button" key={lab} onClick={() => toggleLab(lab)}
                  className="pgrs-lab-btn"
                  style={{
                    border: `1.5px solid ${ativo ? 'var(--accent)' : 'var(--border)'}`,
                    background: ativo ? 'var(--accent-soft)' : '#fff',
                  }}>
                  <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
                    <span className="pgrs-lab-btn-check"
                      style={{
                        border: '1.5px solid ' + (ativo ? 'var(--accent)' : 'var(--border)'),
                        background: ativo ? 'var(--accent)' : '#fff',
                      }}>{ativo && <Icon name="check" size={10} stroke={2.5}/>}</span>
                    <span style={{fontFamily: 'var(--mono)', fontWeight: 600}}>{lab}</span>
                  </div>
                  {labInfo && <div style={{fontSize: 12, color: 'var(--text-3)', marginTop: 2, marginLeft: 19}}>{labInfo.nome}</div>}
                </button>
              );
            })}
          </div>

          <div style={pgrsSub}>Tipos de resíduo cobertos</div>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 14}}>
            {[
              ['quimicos', 'Resíduos químicos perigosos (NBR 10004)'],
              ['biologicos', 'Resíduos de saúde / biológicos (RDC 222)'],
              ['perfurocortantes', 'Perfurocortantes'],
              ['eletronicos', 'Resíduos eletroeletrônicos (REEE)'],
              ['comum', 'Resíduos comuns / recicláveis'],
            ].map(([k, label]) => (
              <label key={k} style={pgrsCheck}>
                <input type="checkbox" aria-label={label} checked={cfg.tipos_residuo[k]} onChange={() => toggle('tipos_residuo', k)}/>
                <span>{label}</span>
              </label>
            ))}
          </div>

          <div className="form-row">
            <div className="field"><label htmlFor="pgrs-vigencia">Periodicidade de revisão</label>
              <select id="pgrs-vigencia" value={cfg.vigencia} onChange={e => set('vigencia', e.target.value)}>
                <option value="anual">Anual (recomendado)</option>
                <option value="bienal">Bienal</option>
                <option value="trienal">Trienal</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {tab === 'metas' && (
        <div>
          <div style={pgrsHint}>Hierarquia de gestão (art. 9º) e metas quantitativas (inciso VI).</div>
          <div style={pgrsSub}>Práticas adotadas: ordem de prioridade</div>
          <div style={{display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14}}>
            {[
              ['naoGeracao', '1. Não-geração'],
              ['reducao', '2. Redução na fonte'],
              ['reutilizacao', '3. Reutilização'],
              ['reciclagem', '4. Reciclagem'],
              ['tratamento', '5. Tratamento'],
              ['destinacao', '6. Destinação ambientalmente adequada'],
            ].map(([k, label]) => (
              <label key={k} style={pgrsCheck}>
                <input type="checkbox" aria-label={label} checked={cfg.hierarquia[k]} onChange={() => toggle('hierarquia', k)}/>
                <span>{label}</span>
              </label>
            ))}
          </div>

          <div style={pgrsSub}>Metas anuais</div>
          <div className="form-row">
            <div className="field"><label htmlFor="pgrs-meta-reducao">Redução de geração (%)</label>
              <input id="pgrs-meta-reducao" aria-label="Meta de redução de geração em percentual" type="number" min={0} max={100} value={cfg.meta_reducao_pct} onChange={e => set('meta_reducao_pct', +e.target.value)} style={{fontFamily: 'var(--mono)'}}/></div>
            <div className="field"><label htmlFor="pgrs-meta-reciclagem">Reciclagem (%)</label>
              <input id="pgrs-meta-reciclagem" aria-label="Meta de reciclagem em percentual" type="number" min={0} max={100} value={cfg.meta_reciclagem_pct} onChange={e => set('meta_reciclagem_pct', +e.target.value)} style={{fontFamily: 'var(--mono)'}}/></div>
          </div>
          <div className="form-row">
            <div className="field"><label htmlFor="pgrs-meta-destinacao">Destinação adequada (%)</label>
              <input id="pgrs-meta-destinacao" aria-label="Meta de destinação adequada em percentual" type="number" min={0} max={100} value={cfg.meta_destinacao_pct} onChange={e => set('meta_destinacao_pct', +e.target.value)} style={{fontFamily: 'var(--mono)'}}/></div>
          </div>

          <div style={pgrsSub}>Parceiros padrão (inciso IV)</div>
          <div className="form-row">
            <div className="field"><label htmlFor="pgrs-transportador-padrao">Transportador padrão</label>
              <input id="pgrs-transportador-padrao" aria-label="Transportador padrão" value={cfg.transportador_padrao} onChange={e => set('transportador_padrao', e.target.value)}/></div>
            <div className="field"><label htmlFor="pgrs-destinador-padrao">Destinador padrão</label>
              <input id="pgrs-destinador-padrao" aria-label="Destinador padrão" value={cfg.destinador_padrao} onChange={e => set('destinador_padrao', e.target.value)}/></div>
          </div>
        </div>
      )}

      {tab === 'aprovacoes' && (
        <div>
          <div style={pgrsHint}>Fluxo de aprovação e publicação do PGRS aos órgãos fiscalizadores.</div>
          <div className="form-row full">
            <div className="field"><label htmlFor="pgrs-workflow">Workflow de assinatura</label>
              <input id="pgrs-workflow" aria-label="Workflow de assinatura" value={cfg.workflow} onChange={e => set('workflow', e.target.value)}/></div>
          </div>
          <div className="form-row">
            <div className="field"><label htmlFor="pgrs-orgao-destino">Órgão fiscalizador destino</label>
              <select id="pgrs-orgao-destino" aria-label="Órgão fiscalizador destino" value={cfg.orgao_destino} onChange={e => set('orgao_destino', e.target.value)}>
                <option value="FEAM-MG">FEAM-MG · Fundação Estadual MA</option>
                <option value="CETESB">CETESB (SP)</option>
                <option value="IBAMA">IBAMA · federal</option>
                <option value="INEA-RJ">INEA-RJ</option>
              </select>
            </div>
            <div className="field"><label htmlFor="pgrs-revisao-proxima">Próxima revisão</label>
              <input id="pgrs-revisao-proxima" aria-label="Data da próxima revisão" type="date" value={cfg.revisao_proxima} onChange={e => set('revisao_proxima', e.target.value)} style={{fontFamily: 'var(--mono)'}}/></div>
          </div>

          <div style={pgrsSub}>Publicação automática</div>
          <div style={{display: 'flex', flexDirection: 'column', gap: 4}}>
            <label htmlFor="pgrs-publicar-sinir" style={pgrsCheck}>
              <input id="pgrs-publicar-sinir" type="checkbox" aria-label="Publicar no SINIR ao gerar nova versão" checked={cfg.publicar_sinir} onChange={() => set('publicar_sinir', !cfg.publicar_sinir)}/>
              <span>Publicar no <strong>SINIR</strong> (Sistema Nacional · MMA) ao gerar nova versão</span>
            </label>
            <label htmlFor="pgrs-publicar-sisema" style={pgrsCheck}>
              <input id="pgrs-publicar-sisema" type="checkbox" aria-label="Publicar no SISEMA ao gerar nova versão" checked={cfg.publicar_sisema} onChange={() => set('publicar_sisema', !cfg.publicar_sisema)}/>
              <span>Publicar no <strong>SISEMA</strong> (Sistema Estadual · MG) ao gerar nova versão</span>
            </label>
          </div>

          <div style={{marginTop: 16, padding: 10, background: 'var(--amber-soft)', border: '1px solid var(--amber)', borderRadius: 'var(--radius)', fontSize: 12, lineHeight: 1.5}}>
            <strong>Atenção:</strong> alterações no PGRS publicado exigem nova aprovação do responsável técnico
            e geram nova versão no SINIR. A versão anterior fica arquivada por 5 anos (Lei 12.305 art. 23).
          </div>
        </div>
      )}
    </Modal>
  );
}
