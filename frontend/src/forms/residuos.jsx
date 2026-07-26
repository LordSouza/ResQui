import { useState, useEffect } from 'react';
import { Icon, Badge, riscoBadge } from '../components';
import { REATIVIDADE_CLASSES } from '../data';
import Modal from './Modal';
import { useCriarResiduo } from '../residuos/useCriarResiduo';
import { useAtualizarResiduo } from '../residuos/useAtualizarResiduo';
import { useLaboratorios } from '../laboratorios/useLaboratorios';
import { useCriarMtr } from '../mtrs/useCriarMtr';
import { useResíduos } from '../residuos/useResíduos';
import { downloadMtrPdf } from '../mtrs/downloadMtr';
import { useConfigPgrs } from '../pgrs/useConfigPgrs';
import { useSalvarConfigPgrs } from '../pgrs/useSalvarConfigPgrs';

// Seletor de classes de reatividade da mistura — o backend bloqueia pares Perigo/Proibido na matriz
function ClassesSelector({ idPrefix, value, onChange }) {
  const toggle = (n) =>
    onChange(value.includes(n) ? value.filter(c => c !== n) : [...value, n]);
  return (
    <div className="form-row full">
      <div className="field">
        <label>Classes de reatividade da mistura</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {Object.entries(REATIVIDADE_CLASSES).map(([n, label]) => (
            <label key={n} htmlFor={`${idPrefix}-classe-${n}`} className="btn btn-sm"
              style={{ cursor: 'pointer', opacity: value.includes(Number(n)) ? 1 : 0.55 }}>
              <input id={`${idPrefix}-classe-${n}`} type="checkbox" style={{ marginRight: 4 }}
                checked={value.includes(Number(n))} onChange={() => toggle(Number(n))} />
              {n}. {label}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- Novo Resíduo ----------
export function FormNovoResiduo({ onClose, dispatch }) {
  const criarResiduo = useCriarResiduo();
  const { data: labs = [] } = useLaboratorios();
  const [f, setF] = useState({
    tipo: 'Solventes orgânicos não-halogenados',
    volume: '', unidade: 'L',
    laboratorioId: '', composicao: '', risco: 'medio',
    classes: [],
  });
  const upd = (k, v) => setF(s => ({ ...s, [k]: v }));

  const submit = () => {
    if (!f.volume || !f.composicao || !f.laboratorioId) {
      alert('Volume, composição e laboratório são obrigatórios.');
      return;
    }
    criarResiduo.mutate(
      {
        Descricao: f.composicao.slice(0, 80),
        // IDs de laboratório são strings ("Lab-001"); o backend usa o número da sequência
        LaboratorioId: Number(String(f.laboratorioId).replace(/\D/g, '')),
        Tipo: f.tipo,
        Volume: Number(f.volume),
        Unidade: f.unidade,
        Composicao: f.composicao,
        Risco: f.risco,
        Destino: null,
        ClassesReatividade: f.classes,
      },
      {
        onSuccess: () => { dispatch({ type: 'refresh' }); onClose(); },
      }
    );
  };

  return (
    <Modal title="Registrar resíduo" sub="Identificação na fonte conforme PNRS · Lei 12.305/2010"
      onClose={onClose} width={620}
      footer={<>
        <button type="button" className="btn btn-sm" onClick={onClose}>Cancelar</button>
        <button type="button" className="btn btn-primary btn-sm" onClick={submit} disabled={criarResiduo.isPending}>
          {criarResiduo.isPending ? 'Salvando…' : 'Registrar resíduo'}
        </button>
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
          <div style={{ display: 'flex', gap: 6 }}>
            <input id="residuo-volume" style={{ flex: 1 }} type="number" step="0.1" value={f.volume} onChange={e => upd('volume', e.target.value)} aria-label="Volume" />
            <select style={{ width: 80 }} value={f.unidade} onChange={e => upd('unidade', e.target.value)} aria-label="Unidade de volume">
              <option>L</option><option>mL</option><option>kg</option><option>g</option><option>m³</option>
            </select>
          </div>
        </div>
        <div className="field"><label htmlFor="residuo-lab">Laboratório *</label>
          <select id="residuo-lab" value={f.laboratorioId} onChange={e => upd('laboratorioId', e.target.value)}>
            <option value="">Selecione…</option>
            {labs.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
          </select>
        </div>
      </div>
      <div className="form-row full">
        <div className="field"><label htmlFor="residuo-composicao">Composição declarada *</label>
          <textarea id="residuo-composicao" rows={3} value={f.composicao} onChange={e => upd('composicao', e.target.value)}
            placeholder="Ex: 60% acetona + 30% etanol + traços de HCl, pH 6" />
        </div>
      </div>
      <ClassesSelector idPrefix="residuo" value={f.classes} onChange={v => upd('classes', v)} />
      <div className="residuo-warning-banner">
        <Icon name="warning" size={14} />
        <span>Após cadastrar, o sistema rotula automaticamente o recipiente e move para "aguardando coleta".</span>
      </div>
    </Modal>
  );
}

// ---------- Editar Resíduo ----------
export function FormEditarResiduo({ residuo, onClose, dispatch }) {
  const atualizarResiduo = useAtualizarResiduo();
  const [f, setF] = useState({
    tipo: residuo.tipo ?? '',
    volume: residuo.volume ?? '',
    unidade: residuo.unidade ?? 'L',
    composicao: residuo.composicao ?? '',
    risco: residuo.risco ?? 'medio',
    classes: residuo.classes ?? [],
  });
  const upd = (k, v) => setF(s => ({ ...s, [k]: v }));

  const submit = () => {
    if (!f.volume || !f.composicao) { alert('Volume e composição são obrigatórios.'); return; }
    atualizarResiduo.mutate(
      { id: residuo.id, Tipo: f.tipo, Volume: Number(f.volume), Unidade: f.unidade, Composicao: f.composicao, Risco: f.risco, ClassesReatividade: f.classes },
      { onSuccess: () => { dispatch({ type: 'refresh' }); onClose(); } }
    );
  };

  return (
    <Modal title="Editar resíduo" sub={`Resíduo #${residuo.id}`}
      onClose={onClose} width={560}
      footer={<>
        <button type="button" className="btn btn-sm" onClick={onClose}>Cancelar</button>
        <button type="button" className="btn btn-primary btn-sm" onClick={submit} disabled={atualizarResiduo.isPending}>
          {atualizarResiduo.isPending ? 'Salvando…' : 'Salvar alterações'}
        </button>
      </>}>
      <div className="form-row">
        <div className="field"><label htmlFor="edit-tipo">Tipo</label>
          <select id="edit-tipo" value={f.tipo} onChange={e => upd('tipo', e.target.value)}>
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
        <div className="field"><label htmlFor="edit-risco">Risco</label>
          <select id="edit-risco" value={f.risco} onChange={e => upd('risco', e.target.value)}>
            <option value="baixo">Baixo</option>
            <option value="medio">Médio</option>
            <option value="alto">Alto</option>
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="field"><label htmlFor="edit-volume">Volume / massa</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <input id="edit-volume" style={{ flex: 1 }} type="number" step="0.1" value={f.volume} onChange={e => upd('volume', e.target.value)} />
            <select style={{ width: 80 }} value={f.unidade} onChange={e => upd('unidade', e.target.value)}>
              <option>L</option><option>mL</option><option>kg</option><option>g</option><option>m³</option>
            </select>
          </div>
        </div>
      </div>
      <div className="form-row full">
        <div className="field"><label htmlFor="edit-composicao">Composição</label>
          <textarea id="edit-composicao" rows={3} value={f.composicao} onChange={e => upd('composicao', e.target.value)} />
        </div>
      </div>
      <ClassesSelector idPrefix="edit" value={f.classes} onChange={v => upd('classes', v)} />
    </Modal>
  );
}

// ---------- Novo Pré-MTR ----------
export function FormNovoMtr({ onClose, dispatch }) {
  const criarMtr = useCriarMtr();
  const { data: residuos = [] } = useResíduos({ status: 'aguardando-coleta' });
  const [selected, setSelected] = useState([]);
  const [f, setF] = useState({ transp: 'EcoLog Transportes', dest: 'EcoQuímica SA', codigo: 'A099', gerador: 'Unifei' });

  const toggle = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const toKg = { kg: 1, g: 0.001, L: 1.0, mL: 0.001, 'm³': 1000 };
  const massa = selected.reduce((s, id) => {
    const r = residuos.find(x => x.id === id);
    return s + (r ? r.volume * (toKg[r.unidade] ?? 1.0) : 0);
  }, 0);

  const submit = () => {
    if (selected.length === 0) { alert('Selecione ao menos um resíduo.'); return; }
    criarMtr.mutate(
      { Gerador: f.gerador, Transportadora: f.transp, Destinador: f.dest, CodigoIbama: f.codigo, ResiduoIds: selected },
      { onSuccess: () => { dispatch({ type: 'refresh' }); onClose(); } }
    );
  };

  return (
    <Modal title="Novo Pré-MTR" sub="Consolida resíduos para transporte e destinação · base ANTT 5947/21"
      onClose={onClose} width={680}
      footer={<>
        <button type="button" className="btn btn-sm" onClick={onClose}>Cancelar</button>
        <button type="button" className="btn btn-primary btn-sm" onClick={submit} disabled={criarMtr.isPending}>
          {criarMtr.isPending ? 'Criando…' : `Criar Pré-MTR (${selected.length})`}
        </button>
      </>}>
      <div className="form-row">
        <div className="field"><label htmlFor="mtr-gerador">Gerador</label>
          <input id="mtr-gerador" value={f.gerador} onChange={e => setF(s => ({ ...s, gerador: e.target.value }))} />
        </div>
        <div className="field"><label htmlFor="mtr-codigo-ibama">Código IBAMA</label>
          <input id="mtr-codigo-ibama" value={f.codigo} onChange={e => setF(s => ({ ...s, codigo: e.target.value }))} placeholder="Ex: A099" />
        </div>
      </div>
      <div className="form-row">
        <div className="field"><label htmlFor="mtr-transportador">Transportador</label>
          <select id="mtr-transportador" value={f.transp} onChange={e => setF(s => ({ ...s, transp: e.target.value }))}>
            <option>EcoLog Transportes</option><option>CleanWaste</option>
          </select>
        </div>
        <div className="field"><label htmlFor="mtr-destinador">Destinador</label>
          <select id="mtr-destinador" value={f.dest} onChange={e => setF(s => ({ ...s, dest: e.target.value }))}>
            <option>EcoQuímica SA</option><option>Resitec Ambiental</option>
          </select>
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <p className="small muted" style={{ marginBottom: 6 }}>Resíduos aguardando coleta ({residuos.length})</p>
        {residuos.length === 0 && <p className="muted small">Nenhum resíduo aguardando coleta.</p>}
        {residuos.map((r) => (
          <label key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', cursor: 'pointer' }}>
            <input type="checkbox" checked={selected.includes(r.id)} onChange={() => toggle(r.id)} />
            <span className="mono small">#{r.id}</span>
            <span>{r.tipo}</span>
            <span className="muted small">{r.volume} {r.unidade}</span>
          </label>
        ))}
      </div>
      {selected.length > 0 && (
        <p className="small" style={{ marginTop: 10 }}>
          Massa estimada: <strong>{massa.toFixed(1)} kg</strong> ({selected.length} resíduos)
        </p>
      )}
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

export function FormPreviewMtrPdf({ mtr, residuos = [], onClose }) {
  // Preview espelha o PDF real do backend (PdfService.ManifestoMtr) — só dados reais do MTR.
  const emissao = mtr.data_emissao ? mtr.data_emissao.slice(0, 10).split('-').reverse().join('/') : '—';
  return (
    <Modal title={`Pré-visualização · ${mtr.numero}`} sub="Pré-MTR · uso interno — não substitui o MTR oficial do SINIR"
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
        <button type="button" className="btn btn-primary btn-sm" onClick={() => downloadMtrPdf(mtr.id, mtr.numero)}>
          <Icon name="download" size={12}/> Baixar PDF
        </button>
      </>}>
      <div className="mtr-preview-bg">
        <div className="mtr-sheet mtr-sheet-doc">
          {/* Cabeçalho */}
          <div style={{display: 'grid', gridTemplateColumns: '1fr 120px', gap: 14, alignItems: 'center', borderBottom: '2px solid #111', paddingBottom: 12}}>
            <div>
              <div style={{fontSize: 15, fontWeight: 700}}>
                Manifesto de Transporte de Resíduos (Pré-MTR)
              </div>
              <div style={{fontSize: 12, color: '#444', marginTop: 2}}>
                Sistema de gestão ResQui · Resolução ANTT 5947/21
              </div>
            </div>
            <div style={{textAlign: 'right'}}>
              <div style={{fontSize: 12, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em'}}>Nº do manifesto</div>
              <div style={{fontFamily: 'Courier, monospace', fontSize: 13, fontWeight: 700, marginTop: 2}}>{mtr.numero}</div>
            </div>
          </div>

          {/* Barra de status */}
          <div className="mtr-status-bar">
            Documento de uso interno · não substitui o MTR oficial do SINIR
          </div>

          {/* Seção 1 - Dados do manifesto */}
          <SectionMtr num="1" title="DADOS DO MANIFESTO">
            <RowMtr label="Data de emissão" value={emissao}/>
            <RowMtr label="Gerador" value={mtr.gerador}/>
            <RowMtr label="Transportadora" value={mtr.transportadora}/>
            <RowMtr label="Destinador" value={mtr.destinador || '—'}/>
            <RowMtr label="Código IBAMA" value={mtr.codigo_ibama || '—'} mono/>
            <RowMtr label="Massa total (kg)" value={Number(mtr.massa ?? 0).toFixed(2)} mono/>
            <RowMtr label="Status" value={mtr.status}/>
          </SectionMtr>

          {/* Seção 2 - Resíduos */}
          <SectionMtr num="2" title={`RESÍDUOS (${residuos.length})`}>
            <table style={{width: '100%', borderCollapse: 'collapse', fontSize: 12, marginTop: 6}}>
              <thead>
                <tr style={{background: '#f0f0f0'}}>
                  <th style={mtrTh}>ID</th>
                  <th style={mtrTh}>Descrição</th>
                  <th style={mtrTh}>Tipo</th>
                  <th style={{...mtrTh, textAlign: 'right'}}>Quantidade</th>
                  <th style={mtrTh}>Risco</th>
                  <th style={mtrTh}>Classes</th>
                </tr>
              </thead>
              <tbody>
                {residuos.length === 0 && (
                  <tr><td style={mtrTd} colSpan={6}>Nenhum resíduo vinculado.</td></tr>
                )}
                {residuos.map((r) => (
                  <tr key={r.id}>
                    <td style={mtrTd}>#{r.id}</td>
                    <td style={mtrTd}>{r.descricao}</td>
                    <td style={mtrTd}>{r.tipo}</td>
                    <td style={{...mtrTd, textAlign: 'right', fontFamily: 'Courier, monospace'}}>{Number(r.volume ?? 0)} {r.unidade}</td>
                    <td style={mtrTd}>{r.risco}</td>
                    <td style={mtrTd}>{(r.classes ?? []).length > 0 ? r.classes.join(', ') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SectionMtr>

          {/* Assinaturas */}
          <div style={{marginTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 12}}>
            {['pelo gerador', 'pelo transporte'].map(t => (
              <div key={t}>
                <div style={{marginTop: 22, height: 1, background: '#111'}}/>
                <div style={{fontSize: 12, color: '#666', textAlign: 'center', marginTop: 4}}>Responsável {t}</div>
              </div>
            ))}
          </div>

          {/* Rodapé honesto */}
          <div style={{marginTop: 22, paddingTop: 12, borderTop: '1px solid #111', fontSize: 12, color: '#444', lineHeight: 1.5}}>
            ResQui · Pré-MTR de uso interno — não substitui o MTR oficial do SINIR. Emita o manifesto
            oficial em <span style={{fontFamily: 'Courier, monospace'}}>sinir.gov.br</span>.
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ---------- Configurar PGRS (Lei 12.305/10 art. 21) ----------
const pgrsHint = { fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5, marginBottom: 14, padding: '8px 10px', background: 'var(--surface-2)', borderRadius: 'var(--radius)', borderLeft: '3px solid var(--accent)' };
const pgrsSub = { fontSize: 12, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', marginBottom: 8, marginTop: 4 };

export function FormConfigurarPgrs({ onClose }) {
  const { data: cfgApi, isPending } = useConfigPgrs();
  const salvar = useSalvarConfigPgrs();
  const [f, setF] = useState(null);

  useEffect(() => {
    if (!cfgApi) return;
    setF({
      razaoSocial: cfgApi.razaoSocial ?? '', cnpj: cfgApi.cnpj ?? '',
      endereco: cfgApi.endereco ?? '', unidade: cfgApi.unidade ?? '',
      respTecnico: cfgApi.respTecnico ?? '', respCrq: cfgApi.respCrq ?? '',
      respEmail: cfgApi.respEmail ?? '', respTel: cfgApi.respTel ?? '',
      geradorPadrao: cfgApi.geradorPadrao ?? '', transportadorPadrao: cfgApi.transportadorPadrao ?? '',
      destinadorPadrao: cfgApi.destinadorPadrao ?? '', codigoIbamaPadrao: cfgApi.codigoIbamaPadrao ?? '',
    });
  }, [cfgApi]);

  const set = (k, v) => setF(s => ({ ...s, [k]: v }));

  const submit = () => {
    salvar.mutate({
      RazaoSocial: f.razaoSocial, Cnpj: f.cnpj, Endereco: f.endereco, Unidade: f.unidade,
      RespTecnico: f.respTecnico, RespCrq: f.respCrq, RespEmail: f.respEmail, RespTel: f.respTel,
      GeradorPadrao: f.geradorPadrao, TransportadorPadrao: f.transportadorPadrao,
      DestinadorPadrao: f.destinadorPadrao, CodigoIbamaPadrao: f.codigoIbamaPadrao,
    }, { onSuccess: onClose });
  };

  return (
    <Modal title="Configurar PGRS" sub="Dados institucionais usados no relatório PGRS e como padrão do Pré-MTR"
      onClose={onClose} width={680}
      footer={<>
        <button type="button" className="btn btn-sm" onClick={onClose}>Cancelar</button>
        <button type="button" className="btn btn-primary btn-sm" onClick={submit} disabled={!f || salvar.isPending}>
          <Icon name="check" size={12}/> {salvar.isPending ? 'Salvando…' : 'Salvar configuração'}
        </button>
      </>}>
      {isPending && !f && <div className="page-loading"><Icon name="refresh" size={16}/> Carregando...</div>}
      {f && (
        <>
          <div style={pgrsHint}>Identificação do empreendimento (Lei 12.305/10, art. 21, inc. I). Campos em branco são omitidos do relatório.</div>
          <div className="form-row full">
            <div className="field"><label htmlFor="pgrs-razao-social">Razão social</label>
              <input id="pgrs-razao-social" aria-label="Razão social" value={f.razaoSocial} onChange={e => set('razaoSocial', e.target.value)}/></div>
          </div>
          <div className="form-row">
            <div className="field"><label htmlFor="pgrs-cnpj">CNPJ</label>
              <input id="pgrs-cnpj" aria-label="CNPJ" value={f.cnpj} onChange={e => set('cnpj', e.target.value)} style={{fontFamily: 'var(--mono)'}}/></div>
            <div className="field"><label htmlFor="pgrs-unidade">Unidade geradora</label>
              <input id="pgrs-unidade" aria-label="Unidade geradora" value={f.unidade} onChange={e => set('unidade', e.target.value)}/></div>
          </div>
          <div className="form-row full">
            <div className="field"><label htmlFor="pgrs-endereco">Endereço</label>
              <input id="pgrs-endereco" aria-label="Endereço" value={f.endereco} onChange={e => set('endereco', e.target.value)}/></div>
          </div>

          <div style={pgrsSub}>Responsável técnico</div>
          <div className="form-row">
            <div className="field"><label htmlFor="pgrs-resp-nome">Nome</label>
              <input id="pgrs-resp-nome" aria-label="Nome do responsável técnico" value={f.respTecnico} onChange={e => set('respTecnico', e.target.value)}/></div>
            <div className="field"><label htmlFor="pgrs-resp-crq">Registro CRQ</label>
              <input id="pgrs-resp-crq" aria-label="Registro CRQ" value={f.respCrq} onChange={e => set('respCrq', e.target.value)} style={{fontFamily: 'var(--mono)'}}/></div>
          </div>
          <div className="form-row">
            <div className="field"><label htmlFor="pgrs-resp-email">E-mail</label>
              <input id="pgrs-resp-email" aria-label="E-mail do responsável técnico" value={f.respEmail} onChange={e => set('respEmail', e.target.value)} style={{fontFamily: 'var(--mono)'}}/></div>
            <div className="field"><label htmlFor="pgrs-resp-tel">Telefone</label>
              <input id="pgrs-resp-tel" aria-label="Telefone do responsável técnico" value={f.respTel} onChange={e => set('respTel', e.target.value)} style={{fontFamily: 'var(--mono)'}}/></div>
          </div>

          <div style={pgrsSub}>Padrões do Pré-MTR</div>
          <div style={pgrsHint}>Preenchem os campos do novo Pré-MTR; seguem editáveis a cada emissão.</div>
          <div className="form-row">
            <div className="field"><label htmlFor="pgrs-gerador">Gerador padrão</label>
              <input id="pgrs-gerador" aria-label="Gerador padrão" value={f.geradorPadrao} onChange={e => set('geradorPadrao', e.target.value)}/></div>
            <div className="field"><label htmlFor="pgrs-codigo-ibama">Código IBAMA padrão</label>
              <input id="pgrs-codigo-ibama" aria-label="Código IBAMA padrão" value={f.codigoIbamaPadrao} onChange={e => set('codigoIbamaPadrao', e.target.value)} style={{fontFamily: 'var(--mono)'}}/></div>
          </div>
          <div className="form-row">
            <div className="field"><label htmlFor="pgrs-transportador">Transportador padrão</label>
              <input id="pgrs-transportador" aria-label="Transportador padrão" value={f.transportadorPadrao} onChange={e => set('transportadorPadrao', e.target.value)}/></div>
            <div className="field"><label htmlFor="pgrs-destinador">Destinador padrão</label>
              <input id="pgrs-destinador" aria-label="Destinador padrão" value={f.destinadorPadrao} onChange={e => set('destinadorPadrao', e.target.value)}/></div>
          </div>
        </>
      )}
    </Modal>
  );
}
