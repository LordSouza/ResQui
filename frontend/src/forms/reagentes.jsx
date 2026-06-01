import { useState, useReducer, useRef, useId } from 'react';
import { Icon, Badge, Tag, Picto } from '../components';
import { AUDITORIA, REATIVIDADE_CLASSES, PICTOS_GHS } from '../data';
import { useCriarReagente } from '../reagentes/useCriarReagente';
import { useBaixaReagente } from '../reagentes/useBaixaReagente';
import { pgrsTs } from '../utils';
import Modal from './Modal';
import { useCompatOverrides } from '../compat/useCompatOverrides';
import { useSalvarCompatOverride } from '../compat/useSalvarCompatOverride';
import { useRemoverCompatOverride } from '../compat/useRemoverCompatOverride';
import { useToast } from '../components/ToastContext';

// ---------- Novo Reagente ----------
export function FormNovoReagente({ onClose, dispatch }) {
  const uid = useId();
  const ids = {
    nome: `${uid}-nome`, sinonimo: `${uid}-sinonimo`,
    cas: `${uid}-cas`, formula: `${uid}-formula`,
    classe: `${uid}-classe`, lote: `${uid}-lote`,
    estoque: `${uid}-estoque`, unidade: `${uid}-unidade`,
    validade: `${uid}-validade`, local: `${uid}-local`,
    responsavel: `${uid}-responsavel`, signal: `${uid}-signal`,
    controlado: `${uid}-controlado`, pictos: `${uid}-pictos`,
    h: `${uid}-h`, p: `${uid}-p`,
  };
  const criarMutation = useCriarReagente();
  const [f, setF] = useState({
    nome: '', sinonimo: '', cas: '', formula: '', classe: 1,
    estoque: '', unidade: 'L', validade: '', local: 'Lab-201 · Armário A · Pra. 1',
    responsavel: 'Profa. Ana Lima', controlado: false, lote: '',
    pictos: [], signal: 'Atenção',
    h: '', p: '',
  });
  const upd = (k, v) => setF(s => ({...s, [k]: v}));
  const togglePicto = (p) => setF(s => ({...s, pictos: s.pictos.includes(p) ? s.pictos.filter(x => x !== p) : [...s.pictos, p]}));

  const submit = () => {
    if (!f.nome || !f.cas) { alert('Nome e CAS são obrigatórios.'); return; }
    const cmd = {
      Nome: f.nome,
      Cas: f.cas,
      Formula: f.formula || '—',
      Sinonimo: f.sinonimo || f.nome,
      ClasseReatividade: Number(f.classe),
      Estoque: Number(f.estoque) || 0,
      EstoqueMin: null,
      Unidade: f.unidade,
      Validade: f.validade || null,
      Local: f.local,
      Responsavel: f.responsavel,
      Controlado: f.controlado,
      Lote: f.lote || null,
      Ghs: {
        Pictos: f.pictos,
        Signal: f.signal,
        FrasesH: f.h ? f.h.split('\n').filter(Boolean) : [],
        FrasesP: f.p ? f.p.split('\n').filter(Boolean) : [],
      },
    };
    criarMutation.mutate(cmd, {
      onSuccess: (data) => {
        dispatch({ type: 'refresh', flashId: data?.id });
        onClose();
      },
    });
  };

  return (
    <Modal title="Novo reagente" sub="Cadastro com identificação química e classificação GHS"
      onClose={onClose} width={680}
      footer={<>
        <button type="button" className="btn btn-sm" onClick={onClose}>Cancelar</button>
        <button type="button" className="btn btn-primary btn-sm" onClick={submit} disabled={criarMutation.isPending}>
          {criarMutation.isPending ? 'Salvando…' : 'Cadastrar reagente'}
        </button>
      </>}>
      {criarMutation.isError && (
        <div className="login-err" style={{marginBottom: 12}}>{criarMutation.error?.message ?? 'Erro ao cadastrar reagente.'}</div>
      )}
      <div className="form-row">
        <div className="field"><label htmlFor={ids.nome}>Nome *</label><input id={ids.nome} aria-label="Nome do reagente" value={f.nome} onChange={e => upd('nome', e.target.value)} placeholder="ex: Ácido Acético"/></div>
        <div className="field"><label htmlFor={ids.sinonimo}>Sinônimo / nome comercial</label><input id={ids.sinonimo} aria-label="Sinônimo ou nome comercial do reagente" value={f.sinonimo} onChange={e => upd('sinonimo', e.target.value)} placeholder="ex: CH3COOH glacial"/></div>
      </div>
      <div className="form-row">
        <div className="field"><label htmlFor={ids.cas}>CAS *</label><input id={ids.cas} aria-label="Número CAS do reagente" value={f.cas} onChange={e => upd('cas', e.target.value)} placeholder="64-19-7"/></div>
        <div className="field"><label htmlFor={ids.formula}>Fórmula</label><input id={ids.formula} aria-label="Fórmula molecular do reagente" value={f.formula} onChange={e => upd('formula', e.target.value)} placeholder="C2H4O2"/></div>
      </div>
      <div className="form-row">
        <div className="field"><label htmlFor={ids.classe}>Classe de reatividade</label>
          <select id={ids.classe} value={f.classe} onChange={e => upd('classe', e.target.value)}>
            {Object.entries(REATIVIDADE_CLASSES).map(([k, v]) => <option key={k} value={k}>{k}. {v}</option>)}
          </select>
        </div>
        <div className="field"><label htmlFor={ids.lote}>Lote</label><input id={ids.lote} aria-label="Número do lote do reagente" value={f.lote} onChange={e => upd('lote', e.target.value)} placeholder="L-1234-A"/></div>
      </div>
      <div className="form-row">
        <div className="field"><label htmlFor={ids.estoque}>Estoque inicial</label>
          <div style={{display: 'flex', gap: 6}}>
            <input id={ids.estoque} aria-label="Quantidade do estoque inicial" style={{flex: 1}} type="number" step="0.1" value={f.estoque} onChange={e => upd('estoque', e.target.value)}/>
            <select id={ids.unidade} aria-label="Unidade do estoque" style={{width: 80}} value={f.unidade} onChange={e => upd('unidade', e.target.value)}>
              <option>L</option><option>mL</option><option>kg</option><option>g</option>
            </select>
          </div>
        </div>
        <div className="field"><label htmlFor={ids.validade}>Validade</label><input id={ids.validade} aria-label="Data de validade do reagente" type="date" value={f.validade} onChange={e => upd('validade', e.target.value)}/></div>
      </div>
      <div className="form-row">
        <div className="field"><label htmlFor={ids.local}>Localização</label>
          <select id={ids.local} value={f.local} onChange={e => upd('local', e.target.value)}>
            <option>Lab-201 · Armário A · Pra. 1</option>
            <option>Lab-201 · Armário B · Pra. 2</option>
            <option>Lab-201 · Armário D · Pra. 4</option>
            <option>Lab-203 · Armário Inflamáveis · Pra. 1</option>
            <option>Lab-203 · Armário Inflamáveis · Pra. 2</option>
            <option>Lab-205 · Armário C · Pra. 1</option>
            <option>Lab-205 · Armário Oxidantes · Pra. 1</option>
            <option>Lab-209 · Armário Oxidantes · Pra. 2</option>
          </select>
        </div>
        <div className="field"><label htmlFor={ids.responsavel}>Responsável</label>
          <select id={ids.responsavel} value={f.responsavel} onChange={e => upd('responsavel', e.target.value)}>
            <option>Profa. Ana Lima</option>
            <option>Prof. Renan Costa</option>
            <option>Profa. Júlia Reis</option>
            <option>Téc. Carlos Mendes</option>
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="field"><label htmlFor={ids.signal}>Palavra-sinal</label>
          <select id={ids.signal} value={f.signal} onChange={e => upd('signal', e.target.value)}>
            <option>Perigo</option><option>Atenção</option>
          </select>
        </div>
        <div className="field" style={{display: 'flex', alignItems: 'flex-end'}}>
          <label htmlFor={ids.controlado} style={{display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer'}}>
            <input id={ids.controlado} aria-label="Marcar se o reagente é controlado pela Polícia Federal ou Exército" type="checkbox" checked={f.controlado} onChange={e => upd('controlado', e.target.checked)}/>
            Reagente controlado (PF / Exército)
          </label>
        </div>
      </div>

      <div className="field" style={{marginBottom: 12}}>
        <label htmlFor={ids.pictos}>Pictogramas GHS</label>
        <div id={ids.pictos} style={{display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4}}>
          {Object.entries(PICTOS_GHS).map(([k, v]) => (
            <button key={k} type="button"
              onClick={() => togglePicto(k)}
              className="picto-toggle-btn"
              style={{
                background: f.pictos.includes(k) ? 'var(--accent-soft)' : 'var(--surface-2)',
                border: f.pictos.includes(k) ? '1px solid var(--accent)' : '1px solid var(--border)',
              }}>
              <Picto kind={k} small/>
              <span>{v.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="form-row">
        <div className="field"><label htmlFor={ids.h}>Frases H (uma por linha)</label>
          <textarea id={ids.h} aria-label="Frases de perigo H, uma por linha" rows={3} value={f.h} onChange={e => upd('h', e.target.value)} placeholder="H225 Líquido e vapores inflamáveis&#10;H319 Provoca irritação ocular"/>
        </div>
        <div className="field"><label htmlFor={ids.p}>Frases P (uma por linha)</label>
          <textarea id={ids.p} aria-label="Frases de precaução P, uma por linha" rows={3} value={f.p} onChange={e => upd('p', e.target.value)} placeholder="P210 Manter afastado do calor&#10;P280 Usar EPI"/>
        </div>
      </div>
    </Modal>
  );
}

// ---------- Baixa de consumo ----------
export function FormBaixa({ reagente, onClose, dispatch }) {
  const uid = useId();
  const ids = {
    quantidade: `${uid}-quantidade`,
    restara: `${uid}-restara`,
    motivo: `${uid}-motivo`,
  };
  const baixaMutation = useBaixaReagente(reagente.id);
  const [q, setQ] = useState('');
  const [motivo, setMotivo] = useState('Uso em prática didática');
  const submit = () => {
    const n = Number(q);
    if (!n || n <= 0) { alert('Informe uma quantidade válida.'); return; }
    if (n > reagente.estoque) { alert('Quantidade maior que o estoque disponível.'); return; }
    baixaMutation.mutate({ quantidade: n }, {
      onSuccess: () => {
        dispatch({ type: 'refresh', flashId: reagente.id });
        onClose();
      },
    });
  };
  return (
    <Modal title="Baixa de consumo" sub={`${reagente.nome} · ${reagente.id} · estoque atual ${reagente.estoque} ${reagente.unidade}`}
      onClose={onClose} width={460}
      footer={<>
        <button type="button" className="btn btn-sm" onClick={onClose}>Cancelar</button>
        <button type="button" className="btn btn-primary btn-sm" onClick={submit} disabled={baixaMutation.isPending}>
          {baixaMutation.isPending ? 'Salvando…' : 'Confirmar baixa'}
        </button>
      </>}>
      {baixaMutation.isError && (
        <div className="login-err" style={{marginBottom: 12}}>{baixaMutation.error?.message ?? 'Erro ao registrar baixa.'}</div>
      )}
      <div className="form-row">
        <div className="field"><label htmlFor={ids.quantidade}>Quantidade *</label>
          <div style={{display: 'flex', gap: 6}}>
            <input id={ids.quantidade} aria-label="Quantidade a dar baixa" style={{flex: 1}} type="number" step="0.01" value={q} onChange={e => setQ(e.target.value)}/>
            <span style={{padding: '7px 10px', background: 'var(--surface-2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontSize: 12}}>{reagente.unidade}</span>
          </div>
        </div>
        <div className="field"><label htmlFor={ids.restara}>Restará</label>
          <input id={ids.restara} aria-label="Estoque restante após a baixa" value={q ? Math.max(0, reagente.estoque - Number(q)).toFixed(2) + ' ' + reagente.unidade : '—'} readOnly/>
        </div>
      </div>
      <div className="form-row full">
        <div className="field"><label htmlFor={ids.motivo}>Motivo / finalidade</label>
          <select id={ids.motivo} value={motivo} onChange={e => setMotivo(e.target.value)}>
            <option>Uso em prática didática</option>
            <option>Pesquisa / experimento</option>
            <option>Análise / controle de qualidade</option>
            <option>Manutenção / limpeza</option>
            <option>Transferência para outro lab</option>
            <option>Descarte (vencido / danificado)</option>
          </select>
        </div>
      </div>
    </Modal>
  );
}

// ---------- Importar CSV (fluxo simulado) ----------
const IMPORT_PREVIEW = [
  ['Nome',                  'CAS',        'Fórmula', 'Quantidade', 'Unid.', 'Validade',   'Local'],
  ['Ácido sulfúrico 98%',   '7664-93-9',  'H2SO4',   '2.5',        'L',     '2027-03-15', 'Lab-201/A/2'],
  ['Hidróxido de sódio',    '1310-73-2',  'NaOH',    '500',        'g',     '2026-11-30', 'Lab-201/B/1'],
  ['Etanol absoluto',       '64-17-5',    'C2H6O',   '8.0',        'L',     '2026-09-22', 'Lab-203/C/4'],
  ['Acetonitrila HPLC',     '75-05-8',    'C2H3N',   '4.0',        'L',     '—',          'Lab-205/A/1'],
  ['Bicarbonato de sódio',  '144-55-8',   'NaHCO3',  '1',          'kg',    '2028-05-10', 'Lab-209/B/2'],
  ['Cloreto de potássio',   '7447-40-7',  'KCl',     '250',        'g',     '2027-08-01', 'Lab-209/B/3'],
  ['Tolueno P.A.',          '108-88-3',   'C7H8',    '1.0',        'L',     '2026-04-12', 'Lab-203/C/5'],
];

const IMPORT_FIELDS = [
  ['nome',        'Nome',          true],
  ['cas',         'CAS',           true],
  ['formula',     'Fórmula',       false],
  ['estoque',     'Estoque',       true],
  ['unidade',     'Unidade',       true],
  ['validade',    'Validade',      false],
  ['local',       'Local',         true],
  ['__ignore',    '— Ignorar —',   false],
];

const IMPORT_WARNINGS = [
  { linha: 23,  campo: 'CAS',       msg: 'CAS vazio — reagente ficará pendente de identificação', sev: 'amber' },
  { linha: 47,  campo: 'Validade',  msg: 'Validade 2024-08-10 já expirou — será marcado como vencido', sev: 'red' },
  { linha: 89,  campo: 'Estoque',   msg: 'Estoque = 0 — linha será ignorada', sev: 'gray' },
  { linha: 112, campo: 'Local',     msg: '"Lab-XXX/D/1" não cadastrado — será criado automaticamente', sev: 'amber' },
  { linha: 134, campo: 'GHS',       msg: 'Pictogramas não informados — usar Atenção como padrão', sev: 'amber' },
];

const CSV_IMPORT_INITIAL = {
  step: 'pick', // pick | mapping | validating | review | done
  fileName: '',
  dragOver: false,
  mapping: {
    'Nome': 'nome',
    'CAS': 'cas',
    'Fórmula': 'formula',
    'Quantidade': 'estoque',
    'Unid.': 'unidade',
    'Validade': 'validade',
    'Local': 'local',
  },
  progress: 0,
};

function csvImportReducer(state, action) {
  switch (action.type) {
    case 'pick':   return { ...state, fileName: action.fileName, step: 'mapping' };
    case 'dragOver': return { ...state, dragOver: action.value };
    case 'setMapping': return { ...state, mapping: { ...state.mapping, [action.col]: action.field } };
    case 'startValidating': return { ...state, step: 'validating', progress: 0 };
    case 'setProgress': return { ...state, progress: action.value };
    case 'setStep':  return { ...state, step: action.step };
    default: return state;
  }
}

export function FormImportarCSV({ onClose, dispatch }) {
  const [csv, csvDispatch] = useReducer(csvImportReducer, CSV_IMPORT_INITIAL);
  const { step, fileName, dragOver, mapping, progress } = csv;
  const fileInputRef = useRef(null);

  const fakePick = (name) => {
    csvDispatch({ type: 'pick', fileName: name || 'inventario_lab_201_nov2025.csv' });
  };

  const advanceToValidating = () => {
    csvDispatch({ type: 'startValidating' });
    let p = 0;
    const tick = () => {
      p += Math.random() * 18 + 8;
      if (p >= 100) {
        csvDispatch({ type: 'setProgress', value: 100 });
        setTimeout(() => csvDispatch({ type: 'setStep', step: 'review' }), 250);
        return;
      }
      csvDispatch({ type: 'setProgress', value: p });
      setTimeout(tick, 120);
    };
    tick();
  };

  const confirmImport = () => {
    AUDITORIA.unshift({
      ts: pgrsTs(),
      who: 'Lucas Souza',
      what: 'bulk.import',
      where: '-',
      detail: `Importou ${fileName} · 142 reagentes adicionados, 5 avisos`,
      risk: 'low',
    });
    csvDispatch({ type: 'setStep', step: 'done' });
  };

  const headers = IMPORT_PREVIEW[0];
  const bodyRows = IMPORT_PREVIEW.slice(1);

  // —————————— STEP: pick ——————————
  if (step === 'pick') {
    return (
      <Modal title="Importar inventário em lote" sub="Carregue um CSV exportado de planilha (Excel, Google Sheets)"
        onClose={onClose} width={620}
        footer={<>
          <button type="button" className="btn btn-sm" onClick={onClose}>Cancelar</button>
          <button type="button" className="btn btn-sm" onClick={() => fakePick()}>Usar arquivo de exemplo</button>
        </>}>
        <button
          type="button"
          aria-label="Área para arrastar arquivo ou clique para selecionar"
          onDragOver={e => { e.preventDefault(); csvDispatch({ type: 'dragOver', value: true }); }}
          onDragLeave={() => csvDispatch({ type: 'dragOver', value: false })}
          onDrop={e => { e.preventDefault(); csvDispatch({ type: 'dragOver', value: false }); fakePick(e.dataTransfer.files[0]?.name); }}
          onClick={() => fileInputRef.current?.click()}
          className="csv-dropzone"
          style={{
            border: '2px dashed ' + (dragOver ? 'var(--accent)' : 'var(--border)'),
            background: dragOver ? 'var(--accent-soft)' : 'var(--surface-2)',
          }}>
          <input ref={fileInputRef} type="file" accept=".csv,.tsv,.xlsx" style={{display: 'none'}}
            aria-label="Selecionar arquivo CSV, TSV ou XLSX"
            onChange={e => fakePick(e.target.files[0]?.name)}/>
          <div style={{color: 'var(--text-3)', marginBottom: 10, display: 'flex', justifyContent: 'center'}}>
            <Icon name="upload" size={32}/>
          </div>
          <div style={{fontSize: 13, fontWeight: 600, marginBottom: 4}}>
            Arraste o arquivo aqui ou clique para selecionar
          </div>
          <div className="small muted">CSV, TSV ou XLSX · até 5 MB</div>
        </button>

        <div style={{marginTop: 16, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.55}}>
          <div style={{fontWeight: 600, marginBottom: 6, color: 'var(--text)'}}>Colunas esperadas</div>
          <div style={{display: 'flex', flexWrap: 'wrap', gap: 6}}>
            {['Nome', 'CAS', 'Fórmula', 'Quantidade', 'Unidade', 'Validade', 'Local'].map(c => (
              <Tag key={c}>{c}</Tag>
            ))}
          </div>
          <div className="small muted" style={{marginTop: 8}}>
            Colunas com nomes diferentes podem ser remapeadas na próxima etapa.
          </div>
        </div>
      </Modal>
    );
  }

  // —————————— STEP: mapping ——————————
  if (step === 'mapping') {
    return (
      <Modal title="Mapear colunas" sub={fileName}
        onClose={onClose} width={760}
        footer={<>
          <button type="button" className="btn btn-sm" onClick={() => csvDispatch({ type: 'setStep', step: 'pick' })}>Voltar</button>
          <button type="button" className="btn btn-primary btn-sm" onClick={advanceToValidating}>Validar 147 linhas</button>
        </>}>
        <div className="small muted" style={{marginBottom: 10}}>
          Confira o mapeamento detectado. Campos marcados com <span className="mono" style={{color: 'var(--red)'}}>*</span> são obrigatórios.
        </div>
        <div style={{border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden'}}>
          <div className="import-mapping-header">
            <span>Coluna do CSV</span><span/><span>Campo no sistema</span>
          </div>
          {headers.map(h => (
            <div key={h} style={{display: 'grid', gridTemplateColumns: '1fr 16px 1fr', alignItems: 'center', gap: 8,
              padding: '8px 12px', borderBottom: '1px solid var(--border)', fontSize: 12.5}}>
              <span className="mono">{h}</span>
              <span style={{color: 'var(--text-3)', textAlign: 'center'}}>→</span>
              <select aria-label={`Mapear coluna ${h}`} value={mapping[h] || '__ignore'} onChange={e => csvDispatch({ type: 'setMapping', col: h, field: e.target.value })}
                style={{padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 12, background: '#fff'}}>
                {IMPORT_FIELDS.map(([v, label, req]) => (
                  <option key={v} value={v}>{label}{req ? ' *' : ''}</option>
                ))}
              </select>
            </div>
          ))}
        </div>

        <div style={{marginTop: 14}}>
          <div style={{fontSize: 12, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-3)', marginBottom: 6}}>
            Pré-visualização · 7 de 147 linhas
          </div>
          <div style={{border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'auto', maxHeight: 220}}>
            <table style={{width: '100%', fontSize: 12, borderCollapse: 'collapse', fontFamily: 'var(--mono)'}}>
              <thead>
                <tr style={{background: 'var(--surface-2)'}}>
                  {headers.map(h => <th key={h} style={{padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid var(--border)', fontWeight: 500, color: 'var(--text-3)'}}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {bodyRows.map((row, i) => (
                  <tr key={row[0]} style={{borderBottom: i < bodyRows.length - 1 ? '1px solid var(--border)' : 0}}>
                    {row.map((c, j) => <td key={`${row[0]}-${headers[j]}`} style={{padding: '5px 10px', whiteSpace: 'nowrap'}}>{c}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>
    );
  }

  // —————————— STEP: validating ——————————
  if (step === 'validating') {
    return (
      <Modal title="Validando linhas" sub={fileName} onClose={onClose} width={520}>
        <div style={{padding: '30px 10px', textAlign: 'center'}}>
          <div style={{fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14}}>
            Conferindo CAS, validade, locais e compatibilidades
          </div>
          <div style={{height: 6, background: 'var(--surface-3)', borderRadius: 6, overflow: 'hidden', marginBottom: 12}}>
            <div style={{height: '100%', width: '100%', background: 'var(--accent)', transform: `scaleX(${progress / 100})`, transformOrigin: 'left', transition: 'transform 100ms ease'}}/>
          </div>
          <div className="mono tnum small muted">{Math.min(147, Math.round(progress * 1.47))} / 147 linhas</div>
        </div>
      </Modal>
    );
  }

  // —————————— STEP: review ——————————
  if (step === 'review') {
    return (
      <Modal title="Revisar importação" sub={fileName}
        onClose={onClose} width={680}
        footer={<>
          <button type="button" className="btn btn-sm" onClick={() => csvDispatch({ type: 'setStep', step: 'mapping' })}>Voltar ao mapeamento</button>
          <button type="button" className="btn btn-primary btn-sm" onClick={confirmImport}>Importar 142 reagentes</button>
        </>}>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16}}>
          <div style={{padding: 14, border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--green-soft)'}}>
            <div className="small mono" style={{color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4}}>Prontos</div>
            <div style={{fontSize: 22, fontWeight: 600, color: 'var(--green)'}}>142</div>
          </div>
          <div style={{padding: 14, border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--amber-soft)'}}>
            <div className="small mono" style={{color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4}}>Avisos</div>
            <div style={{fontSize: 22, fontWeight: 600, color: 'var(--amber)'}}>5</div>
          </div>
          <div style={{padding: 14, border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface-2)'}}>
            <div className="small mono" style={{color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4}}>Ignoradas</div>
            <div style={{fontSize: 22, fontWeight: 600, color: 'var(--text-2)'}}>0</div>
          </div>
        </div>

        <div style={{fontSize: 12, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-3)', marginBottom: 8}}>
          Avisos detectados
        </div>
        <div style={{border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden'}}>
          {IMPORT_WARNINGS.map((w, i) => (
            <div key={w.linha} style={{display: 'grid', gridTemplateColumns: '60px 90px 1fr 70px', alignItems: 'center', gap: 10,
              padding: '8px 12px', borderBottom: i < IMPORT_WARNINGS.length - 1 ? '1px solid var(--border)' : 0, fontSize: 12}}>
              <span className="mono small muted">Linha {w.linha}</span>
              <Badge kind={w.sev}>{w.campo}</Badge>
              <span>{w.msg}</span>
              <button type="button" className="btn btn-sm" style={{justifySelf: 'end'}}>Editar</button>
            </div>
          ))}
        </div>

        <div className="small muted" style={{marginTop: 12, lineHeight: 1.55}}>
          Os 142 reagentes prontos serão adicionados ao inventário. Os 5 com avisos serão importados com os ajustes descritos acima; você pode editar individualmente depois.
        </div>
      </Modal>
    );
  }

  // —————————— STEP: done ——————————
  return (
    <Modal title="Importação concluída" sub={fileName}
      onClose={onClose} width={480}
      footer={<>
        <button type="button" className="btn btn-sm" onClick={onClose}>Fechar</button>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => { onClose(); dispatch({type: 'refresh'}); }}>Ver inventário</button>
      </>}>
      <div style={{padding: '20px 0', textAlign: 'center'}}>
        <div className="import-done-icon">
          <Icon name="check" size={24}/>
        </div>
        <div style={{fontSize: 15, fontWeight: 600, marginBottom: 4}}>142 reagentes importados</div>
        <div className="small muted">Evento <span className="mono">bulk.import</span> registrado na auditoria.</div>
      </div>
    </Modal>
  );
}

// ---------- Editar regras de compatibilidade ----------
const SCORE_LABELS = ['Compatível', 'Cautela', 'Perigo', 'Proibido'];
const SCORE_KINDS = ['green', 'amber', 'red', 'red'];
const SCORE_COLORS = ['var(--green)', 'var(--amber)', 'var(--red)', '#7a1f1f'];

export function FormEditarRegrasCompat({ onClose, dispatch }) {
  const uid = useId();
  const ids = {
    severidade: `${uid}-severidade`,
    justificativa: `${uid}-justificativa`,
    definidoPor: `${uid}-definido-por`,
  };

  const { data: overrides = [], isPending } = useCompatOverrides();
  const salvar = useSalvarCompatOverride();
  const remover = useRemoverCompatOverride();
  const { addToast } = useToast();

  const [selected, setSelected] = useState(null);
  const [showNew, setShowNew] = useState(false);

  const handleSelect = (o) => {
    setSelected({ a: o.classeA, b: o.classeB, score: o.nivel, motivo: o.motivo, autor: o.autor, data: o.dataEdicao });
  };

  const updateSel = (patch) => setSelected(s => s ? { ...s, ...patch } : s);

  const handleSave = async () => {
    if (!selected) return;
    try {
      await salvar.mutateAsync({
        classeA: selected.a,
        classeB: selected.b,
        Nivel: selected.score,
        Motivo: selected.motivo,
        Autor: selected.autor,
      });
      addToast({ kind: 'success', msg: 'Regra salva com sucesso.' });
      setSelected(null);
    } catch (e) {
      addToast({ kind: 'error', msg: e.message });
    }
  };

  const handleRemove = async () => {
    if (!selected) return;
    try {
      await remover.mutateAsync({ classeA: selected.a, classeB: selected.b });
      addToast({ kind: 'success', msg: 'Regra removida.' });
      setSelected(null);
    } catch (e) {
      addToast({ kind: 'error', msg: e.message });
    }
  };

  const handleAdd = (a, b) => {
    setSelected({ a, b, score: 1, motivo: '', autor: '', data: null });
    setShowNew(false);
  };

  return (
    <Modal title="Editar regras de compatibilidade"
      sub="Sobreposições institucionais à matriz EPA/NOAA padrão"
      onClose={onClose} width={860}
      footer={<>
        <button type="button" className="btn btn-sm" onClick={onClose}>Fechar</button>
        {selected && (
          <button type="button" className="btn btn-primary btn-sm"
            disabled={salvar.isPending}
            onClick={handleSave}>
            {salvar.isPending ? 'Salvando…' : 'Salvar regra'}
          </button>
        )}
      </>}>
      <div style={{display: 'grid', gridTemplateColumns: '300px 1fr', gap: 14, minHeight: 460}}>
        {/* Lista esquerda */}
        <div style={{display: 'flex', flexDirection: 'column', minWidth: 0}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8}}>
            <div style={{fontSize: 12, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-3)'}}>
              {isPending ? '…' : `${overrides.length} regras`}
            </div>
            <button type="button" className="btn btn-sm" onClick={() => setShowNew(true)}>
              <Icon name="plus" size={11}/> Nova
            </button>
          </div>
          <div style={{border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'auto', flex: 1, maxHeight: 440}}>
            {isPending && (
              <div style={{padding: 20, textAlign: 'center', color: 'var(--text-3)', fontSize: 12}}>
                Carregando…
              </div>
            )}
            {!isPending && overrides.map((o) => (
              <button key={`${o.classeA}-${o.classeB}`}
                type="button"
                aria-label={`Selecionar regra: Classe ${o.classeA} × Classe ${o.classeB} — ${SCORE_LABELS[o.nivel]}`}
                onClick={() => handleSelect(o)}
                className="compat-rule-item"
                style={{
                  background: selected?.a === o.classeA && selected?.b === o.classeB ? 'var(--accent-soft)' : 'transparent',
                  borderBottom: '1px solid var(--border)',
                  borderLeft: selected?.a === o.classeA && selected?.b === o.classeB ? '3px solid var(--accent)' : '3px solid transparent',
                }}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4}}>
                  <span className="mono small" style={{color: 'var(--text-2)'}}>
                    Cl. {o.classeA} × Cl. {o.classeB}
                  </span>
                  <Badge kind={SCORE_KINDS[o.nivel]} dot>{SCORE_LABELS[o.nivel]}</Badge>
                </div>
                <div style={{fontSize: 12, color: 'var(--text)', lineHeight: 1.35,
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'}}>
                  {REATIVIDADE_CLASSES[o.classeA]} × {REATIVIDADE_CLASSES[o.classeB]}
                </div>
              </button>
            ))}
            {!isPending && overrides.length === 0 && (
              <div style={{padding: 30, textAlign: 'center', color: 'var(--text-3)', fontSize: 12}}>
                Nenhuma regra. A matriz cai para os padrões EPA/NOAA.
              </div>
            )}
          </div>
        </div>

        {/* Editor direita */}
        {selected ? (
          <div style={{border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16, background: 'var(--surface-2)', minWidth: 0}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14}}>
              <div>
                <div style={{fontSize: 12, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-3)', marginBottom: 4}}>
                  Regra · Cl. {selected.a} × Cl. {selected.b}
                </div>
                <div style={{fontSize: 14, fontWeight: 600, lineHeight: 1.3}}>
                  {REATIVIDADE_CLASSES[selected.a]}<br/>
                  <span style={{color: 'var(--text-3)', fontSize: 12, fontFamily: 'var(--mono)'}}>×</span><br/>
                  {REATIVIDADE_CLASSES[selected.b]}
                </div>
              </div>
              <button type="button" className="btn btn-sm"
                disabled={remover.isPending}
                onClick={handleRemove}>
                <Icon name="trash" size={12}/> {remover.isPending ? 'Removendo…' : 'Excluir'}
              </button>
            </div>

            <div className="form-row full">
              <div className="field">
                <label htmlFor={ids.severidade}>Severidade</label>
                <div id={ids.severidade} style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6}}>
                  {SCORE_LABELS.map((lbl, s) => (
                    <button type="button" key={lbl} onClick={() => updateSel({score: s})}
                      className="score-btn"
                      style={{
                        border: '1px solid ' + (selected.score === s ? SCORE_COLORS[s] : 'var(--border)'),
                        background: selected.score === s ? SCORE_COLORS[s] : 'var(--surface)',
                        color: selected.score === s ? '#fff' : 'var(--text-2)',
                        fontWeight: selected.score === s ? 600 : 400,
                      }}>
                      {s}. {lbl}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="form-row full">
              <div className="field">
                <label htmlFor={ids.justificativa}>Justificativa técnica</label>
                <textarea id={ids.justificativa}
                  aria-label="Justificativa técnica da regra de compatibilidade"
                  value={selected.motivo}
                  onChange={e => updateSel({motivo: e.target.value})}
                  rows={4}
                  placeholder="Descreva o risco químico, citando norma, FISPQ ou referência institucional."
                  style={{resize: 'vertical', fontFamily: 'var(--font)', lineHeight: 1.45}}/>
              </div>
            </div>

            <div className="form-row">
              <div className="field">
                <label htmlFor={ids.definidoPor}>Definido por</label>
                <input id={ids.definidoPor}
                  aria-label="Nome do responsável pela regra"
                  value={selected.autor}
                  onChange={e => updateSel({autor: e.target.value})}/>
              </div>
              {selected.data && (
                <div className="field">
                  <label>Última edição</label>
                  <input readOnly value={selected.data} style={{color: 'var(--text-3)'}}/>
                </div>
              )}
            </div>

            <div className="compat-warning-notice">
              <Icon name="warning" size={14}/>
              <span>Alterações são auditadas e aplicadas instantaneamente em todos os armários virtuais. Bloqueios passam a valer para novos lançamentos.</span>
            </div>
          </div>
        ) : (
          <div style={{border: '1px dashed var(--border)', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: 12}}>
            Selecione uma regra à esquerda ou adicione uma nova.
          </div>
        )}
      </div>

      {showNew && <NovaRegraInline onCancel={() => setShowNew(false)} onAdd={handleAdd}/>}
    </Modal>
  );
}

function NovaRegraInline({ onCancel, onAdd }) {
  const uid = useId();
  const ids = { classeA: `${uid}-classe-a`, classeB: `${uid}-classe-b` };
  const [a, setA] = useState(1);
  const [b, setB] = useState(3);
  return (
    <button
      type="button"
      aria-label="Fechar diálogo de nova regra"
      onClick={onCancel}
      onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); onCancel(); } }}
      className="compat-rule-backdrop">
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--surface)', borderRadius: 10, padding: 18, width: 420,
        boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
      }}>
        <div style={{fontSize: 14, fontWeight: 600, marginBottom: 12}}>Nova regra</div>
        <div className="form-row">
          <div className="field">
            <label htmlFor={ids.classeA}>Classe A</label>
            <select id={ids.classeA} value={a} onChange={e => setA(Number(e.target.value))}>
              {Object.entries(REATIVIDADE_CLASSES).map(([k, v]) => (
                <option key={k} value={k}>{k}. {v}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor={ids.classeB}>Classe B</label>
            <select id={ids.classeB} value={b} onChange={e => setB(Number(e.target.value))}>
              {Object.entries(REATIVIDADE_CLASSES).map(([k, v]) => (
                <option key={k} value={k}>{k}. {v}</option>
              ))}
            </select>
          </div>
        </div>
        <div style={{display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6}}>
          <button type="button" className="btn btn-sm" onClick={onCancel}>Cancelar</button>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => onAdd(a, b)}>Adicionar</button>
        </div>
      </div>
    </button>
  );
}

// ---------- Preview da FISPQ (ABNT NBR 14725) ----------
const mtrTh = { padding: '6px 8px', border: '1px solid #bbb', textAlign: 'left', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 };
const mtrTd = { padding: '5px 8px', border: '1px solid #ddd', verticalAlign: 'top' };
const fispqList = { margin: '4px 0 0 16px', padding: 0, fontSize: 12, lineHeight: 1.5 };

function SectionMtr({ num, title, children }) {
  return (
    <div style={{marginTop: 14}}>
      <div className="fispq-section-header">
        <span style={{fontFamily: 'Courier, monospace', opacity: 0.7}}>§{num}</span>
        <span>{title}</span>
      </div>
      <div style={{padding: '6px 10px', border: '1px solid #ddd', borderTop: 0}}>
        {children}
      </div>
    </div>
  );
}

function RowFispq({ label, value, mono }) {
  return (
    <div style={{display: 'grid', gridTemplateColumns: '180px 1fr', padding: '3px 0', fontSize: 12, gap: 8}}>
      <div style={{color: '#666', textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 12, paddingTop: 1}}>{label}</div>
      <div style={{fontFamily: mono ? 'Courier, monospace' : 'inherit'}}>{value}</div>
    </div>
  );
}

function incompatPara(classe) {
  const inc = {
    1: 'bases fortes, metais reativos, oxidantes',
    2: 'ácidos, oxidantes, água (reação exotérmica)',
    3: 'ácidos, metais anfóteros (Al, Zn)',
    4: 'redutores, materiais combustíveis, ácidos',
    5: 'oxidantes, fontes de ignição, peróxidos',
    6: 'oxidantes fortes, bases fortes, metais alcalinos',
    7: 'redutores, sulfetos, cianetos',
    9: 'ácidos (libera H₂S tóxico), oxidantes',
    11: 'redutores, combustíveis, metais pesados',
  };
  return inc[classe] || 'consultar matriz de compatibilidade';
}

function onuPara(classe) {
  return { 1: 'UN 1789', 2: 'UN 1830', 3: 'UN 1823', 4: 'UN 1791', 5: 'UN 1170', 6: 'UN 1888', 7: 'UN 3077', 11: 'UN 2014' }[classe] || 'UN 3082';
}

function classeRiscoOnu(classe) {
  return { 1: '8 — Corrosivos', 2: '8 — Corrosivos', 3: '8 — Corrosivos', 4: '5.1 — Oxidantes', 5: '3 — Líquidos inflamáveis', 6: '6.1 — Tóxicos', 7: '6.1 — Tóxicos', 11: '5.1 — Oxidantes' }[classe] || '9 — Diversos';
}

export function FormPreviewFispq({ onClose, reagente, dispatch }) {
  const r = reagente;
  if (!r) return null;
  const today = new Date().toLocaleDateString('pt-BR');

  const sections = [
    { num: '1', title: 'Identificação do produto e da empresa', body: (
      <>
        <RowFispq label="Nome comercial" value={r.nome}/>
        <RowFispq label="Sinônimo" value={r.sinonimo}/>
        <RowFispq label="Fórmula molecular" value={r.formula}/>
        <RowFispq label="CAS" value={r.cas} mono/>
        <RowFispq label="Código interno" value={r.id} mono/>
        <RowFispq label="Fornecedor" value="Sigma-Aldrich Brasil Ltda · Av. Eng. Luís Carlos Berrini, 1681 · São Paulo/SP"/>
        <RowFispq label="Telefone emergência" value="0800-707-3333 (Pró-Química · 24h)" mono/>
        <RowFispq label="Recomendações de uso" value="Reagente analítico para uso laboratorial — pesquisa e ensino"/>
      </>) },
    { num: '2', title: 'Identificação de perigos', body: (
      <>
        <div style={{display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap'}}>
          {(r.pictos || []).map(p => {
            const info = PICTOS_GHS[p];
            return (
              <div key={p} className="fispq-picto-tile">
                <span style={{fontFamily: 'Courier, monospace', fontWeight: 700, color: '#c00'}}>{info?.code || p}</span>
                <span style={{fontSize: 12, color: '#444'}}>{info?.label || p}</span>
              </div>);
          })}
        </div>
        <RowFispq label="Palavra de advertência" value={r.signal || 'Atenção'}/>
        <RowFispq label="Classe de reatividade" value={`${r.classe}. ${REATIVIDADE_CLASSES[r.classe]}`}/>
        <div style={{marginTop: 6, fontSize: 12, color: '#666', textTransform: 'uppercase', letterSpacing: '0.04em'}}>Frases de perigo (H)</div>
        <ul style={fispqList}>{(r.h || []).map((h) => <li key={h}>{h}</li>)}</ul>
        <div style={{marginTop: 6, fontSize: 12, color: '#666', textTransform: 'uppercase', letterSpacing: '0.04em'}}>Frases de precaução (P)</div>
        <ul style={fispqList}>{(r.p || []).map((p) => <li key={p}>{p}</li>)}</ul>
      </>) },
    { num: '3', title: 'Composição e informações sobre os ingredientes', body: (
      <table style={{width: '100%', borderCollapse: 'collapse', fontSize: 12}}>
        <thead>
          <tr style={{background: '#f0f0f0'}}>
            <th style={mtrTh}>Componente</th>
            <th style={mtrTh}>CAS</th>
            <th style={mtrTh}>Fórmula</th>
            <th style={{...mtrTh, textAlign: 'right'}}>Concentração</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={mtrTd}>{r.nome}</td>
            <td style={mtrTd}>{r.cas}</td>
            <td style={mtrTd}>{r.formula}</td>
            <td style={{...mtrTd, textAlign: 'right', fontFamily: 'Courier, monospace'}}>≥ 99,5%</td>
          </tr>
        </tbody>
      </table>) },
    { num: '4', title: 'Medidas de primeiros socorros', body: (
      <>
        <RowFispq label="Inalação" value="Remover a vítima para local ventilado. Se a respiração estiver difícil, administrar oxigênio. Buscar atendimento médico."/>
        <RowFispq label="Contato com a pele" value="Lavar imediatamente com água em abundância por 15 minutos. Remover roupas contaminadas."/>
        <RowFispq label="Contato com os olhos" value="Lavar com água corrente em chuveiro de emergência por 15 minutos, mantendo as pálpebras abertas. Buscar atendimento oftalmológico."/>
        <RowFispq label="Ingestão" value="NÃO induzir vômito. Lavar a boca com água. Buscar atendimento médico imediato apresentando esta FISPQ."/>
      </>) },
    { num: '5', title: 'Medidas de combate a incêndio', body: (
      <>
        <RowFispq label="Meios de extinção adequados" value={r.pictos?.includes('flame') ? 'Espuma resistente a álcool, CO₂, pó químico seco. NÃO usar jato d’água direto.' : 'Espuma, CO₂, pó químico, água em neblina.'}/>
        <RowFispq label="Riscos específicos" value="Pode liberar vapores tóxicos em caso de decomposição térmica (CO, CO₂, óxidos)."/>
        <RowFispq label="EPI brigadista" value="Roupa de aproximação + máscara autônoma de pressão positiva (SCBA)."/>
      </>) },
    { num: '6', title: 'Medidas de controle para derramamento ou vazamento', body: (
      <RowFispq label="Procedimento" value="Isolar a área e evacuar o pessoal não essencial. Conter o vazamento com material absorvente inerte (vermiculita, areia seca). Recolher em recipiente identificado para descarte como resíduo perigoso conforme a Política de Resíduos UNIFEI. Evitar liberação em redes pluviais ou cursos d'água."/>) },
    { num: '7', title: 'Manuseio e armazenamento', body: (
      <>
        <RowFispq label="Manuseio" value="Manipular em capela de exaustão com EPI completo (luvas nitrila, óculos ampla visão, jaleco, máscara semifacial se aplicável)."/>
        <RowFispq label="Local de armazenamento" value={r.local}/>
        <RowFispq label="Responsável" value={r.responsavel}/>
        <RowFispq label="Condições" value="Local ventilado, ao abrigo da luz, longe de fontes de calor e ignição. Manter recipiente original bem fechado."/>
        <RowFispq label="Incompatibilidades" value={`Não armazenar próximo a: ${incompatPara(r.classe)}`}/>
      </>) },
    { num: '8', title: 'Controle de exposição e proteção individual', body: (
      <>
        <RowFispq label="Limite de exposição (LT-NR15)" value="Consultar NR-15 Anexo 11 · valores específicos do agente"/>
        <RowFispq label="Proteção respiratória" value="Máscara semifacial com filtro químico apropriado quando exceder LT"/>
        <RowFispq label="Proteção das mãos" value="Luvas de nitrila (espessura ≥ 0,4 mm) · resistência química 480 min"/>
        <RowFispq label="Proteção ocular" value="Óculos de segurança ampla visão + máscara facial em operações com risco de respingo"/>
        <RowFispq label="Proteção corporal" value="Jaleco de manga longa, calça comprida, calçado fechado de couro"/>
      </>) },
    { num: '9', title: 'Propriedades físicas e químicas', body: (
      <table style={{width: '100%', borderCollapse: 'collapse', fontSize: 12}}>
        <tbody>
          <tr><td style={mtrTd}>Estado físico</td><td style={mtrTd}>{r.unidade === 'L' ? 'Líquido' : 'Sólido'}</td><td style={mtrTd}>Cor</td><td style={mtrTd}>Conforme fabricante</td></tr>
          <tr><td style={mtrTd}>Odor</td><td style={mtrTd}>Característico</td><td style={mtrTd}>pH</td><td style={mtrTd}>Ver ficha técnica do fabricante</td></tr>
          <tr><td style={mtrTd}>Ponto de fusão</td><td style={mtrTd}>n/d</td><td style={mtrTd}>Ponto de ebulição</td><td style={mtrTd}>n/d</td></tr>
          <tr><td style={mtrTd}>Densidade</td><td style={mtrTd}>n/d</td><td style={mtrTd}>Solubilidade em água</td><td style={mtrTd}>n/d</td></tr>
        </tbody>
      </table>) },
    { num: '10', title: 'Estabilidade e reatividade', body: (
      <>
        <RowFispq label="Estabilidade" value="Estável sob condições normais de uso e armazenamento."/>
        <RowFispq label="Reações perigosas" value={`Pode reagir violentamente com substâncias da classe: ${incompatPara(r.classe)}`}/>
        <RowFispq label="Decomposição" value="Produtos perigosos: óxidos de carbono, vapores tóxicos."/>
      </>) },
    { num: '11', title: 'Informações toxicológicas', body: (
      <RowFispq label="Toxicidade aguda" value="Consultar ficha técnica do fabricante (DL50, CL50). Sintomas de exposição constam nas frases H acima (Seção 2)."/>) },
    { num: '12', title: 'Informações ecológicas', body: (
      <RowFispq label="Ecotoxicidade" value={r.pictos?.includes('envir') ? 'Produto classificado como tóxico ao meio aquático. Evitar liberação no ambiente.' : 'Não classificado como perigoso ao meio ambiente nas condições normais de uso.'}/>) },
    { num: '13', title: 'Considerações sobre destinação final', body: (
      <RowFispq label="Resíduo" value="Descartar como resíduo perigoso conforme NBR 10004. Encaminhar à coleta seletiva de resíduos químicos UNIFEI. NÃO descartar em pia ou lixo comum. Embalagens vazias devem ser tríplice-lavadas antes do descarte."/>) },
    { num: '14', title: 'Informações sobre transporte', body: (
      <>
        <RowFispq label="Número ONU" value={onuPara(r.classe)} mono/>
        <RowFispq label="Classe de risco" value={classeRiscoOnu(r.classe)}/>
        <RowFispq label="Grupo de embalagem" value="II"/>
        <RowFispq label="Regulamentação" value="ANTT 5947/21 · ABNT NBR 7500"/>
      </>) },
    { num: '15', title: 'Regulamentações', body: (
      <>
        <RowFispq label="Brasil" value="ABNT NBR 14725 · Decreto 7.404/10 (PNRS) · NR-15 · NR-26"/>
        {r.controlado && <RowFispq label="Produto controlado" value="Polícia Federal · Decreto 7.842/12 (DAF/MJ)"/>}
        <RowFispq label="Internacional" value="GHS · OSHA HazCom 2012 · REACH (EC) 1907/2006"/>
      </>) },
    { num: '16', title: 'Outras informações', body: (
      <>
        <RowFispq label="Emissão" value={today}/>
        <RowFispq label="Versão" value="2.1 · revisão institucional UNIFEI"/>
        <RowFispq label="Bibliografia" value="Sigma-Aldrich SDS · CETESB Ficha de Informação · NIOSH Pocket Guide"/>
        <RowFispq label="Aviso" value="As informações contidas nesta ficha refletem o melhor conhecimento técnico atual. Não dispensam o uso de bom senso e julgamento profissional. UNIFEI não se responsabiliza por uso fora das condições aqui descritas."/>
      </>) },
  ];

  return (
    <Modal title={`FISPQ · ${r.nome}`} sub={`Ficha de Informações de Segurança · ABNT NBR 14725 · ${r.id} · CAS ${r.cas}`}
      onClose={onClose} width={920}
      footer={<>
        <button type="button" className="btn btn-sm" onClick={onClose}>Fechar</button>
        <button type="button" className="btn btn-sm" onClick={() => {
          const original = document.querySelector('.fispq-sheet');
          if (!original) { window.print(); return; }
          let portal = document.getElementById('print-portal');
          if (portal) portal.remove();
          portal = document.createElement('div');
          portal.id = 'print-portal';
          portal.appendChild(original.cloneNode(true));
          document.body.appendChild(portal);
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
            what: 'fispq.download',
            where: '-',
            detail: `Baixou FISPQ de ${r.nome} (${r.id})`,
            risk: 'low',
          });
          alert(`Download iniciado: FISPQ-${r.id}-${r.nome.replace(/\s+/g, '_')}.pdf`);
        }}>
          <Icon name="download" size={12}/> Baixar PDF
        </button>
      </>}>
      <div className="fispq-outer-wrapper">
        <div className="fispq-sheet fispq-sheet-inner">
          {/* Cabeçalho */}
          <div style={{display: 'grid', gridTemplateColumns: '50px 1fr 90px', gap: 14, alignItems: 'center', borderBottom: '2px solid #111', paddingBottom: 12}}>
            <div className="fispq-logo-circle">
              UNIFEI<br/>IMC
            </div>
            <div style={{textAlign: 'center'}}>
              <div style={{fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#444'}}>
                ABNT NBR 14725 · Sistema GHS · Decreto 7.404/10
              </div>
              <div style={{fontSize: 13, fontWeight: 700, marginTop: 3}}>
                FICHA DE INFORMAÇÕES DE SEGURANÇA DE PRODUTO QUÍMICO
              </div>
              <div style={{fontSize: 12, color: '#444', marginTop: 2}}>
                Universidade Federal de Itajubá · Instituto de Matemática e Computação
              </div>
            </div>
            <div style={{textAlign: 'right'}}>
              <div style={{fontSize: 12, color: '#666', textTransform: 'uppercase', letterSpacing: '0.08em'}}>Código interno</div>
              <div style={{fontFamily: 'Courier, monospace', fontSize: 13, fontWeight: 700, marginTop: 2}}>{r.id}</div>
              <div style={{fontSize: 12, color: '#666', marginTop: 4}}>16 seções · v2.1</div>
            </div>
          </div>

          {/* Identificação resumida */}
          <div className="fispq-id-strip">
            <div><strong>{r.nome}</strong><br/><span style={{color: '#666'}}>{r.sinonimo}</span></div>
            <div><span style={{color: '#666', fontSize: 12}}>CAS</span><br/><span style={{fontFamily: 'Courier, monospace'}}>{r.cas}</span></div>
            <div><span style={{color: '#666', fontSize: 12}}>Fórmula</span><br/>{r.formula}</div>
          </div>

          {/* 16 seções */}
          {sections.map(s => (
            <SectionMtr key={s.num} num={s.num} title={s.title}>{s.body}</SectionMtr>
          ))}

          {/* Rodapé */}
          <div style={{marginTop: 22, paddingTop: 12, borderTop: '1px solid #111', fontSize: 12, color: '#444', lineHeight: 1.5}}>
            Emitida em {today} (GMT-3) · ResQui v1.4.2 · UNIFEI-IMC · Responsável técnico: Profa. Dra. Ana Lúcia Lima · CRQ 00-00000<br/>
            Hash de integridade: <span style={{fontFamily: 'Courier, monospace'}}>SHA-256 · a4f2b91d8e6c3057214{r.id.slice(-3)}bcdef</span>
          </div>
        </div>
        <div style={{textAlign: 'center', marginTop: 12, fontSize: 12, color: 'var(--text-3)'}}>
          16 páginas · A4 retrato · ABNT NBR 14725:2014
        </div>
      </div>
    </Modal>
  );
}
