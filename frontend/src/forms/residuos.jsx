import { useState, useEffect } from 'react';
import { Icon, Badge, riscoBadge } from '../components';
import { REATIVIDADE_CLASSES, TIPOS_RESIDUO } from '../data';
import Modal from './Modal';
import { useCriarResiduo } from '../residuos/useCriarResiduo';
import { useAtualizarResiduo } from '../residuos/useAtualizarResiduo';
import { useLaboratoriosDoUsuario } from '../laboratorios/useLaboratoriosDoUsuario';
import { useCriarMtr } from '../mtrs/useCriarMtr';
import { useResíduos } from '../residuos/useResíduos';
import { downloadMtrPdf } from '../mtrs/downloadMtr';
import { useConfigPgrs } from '../pgrs/useConfigPgrs';
import { useSalvarConfigPgrs } from '../pgrs/useSalvarConfigPgrs';
import { useConfirmarDestinacao } from '../mtrs/useConfirmarDestinacao';
import { useReabrirDestinacao } from '../mtrs/useReabrirDestinacao';
import { useRejeitarResiduo } from '../residuos/useRejeitarResiduo';
import { quantidadesResiduos, formatarQuantidade } from '../utils';
import { useVereditoMistura } from '../compat/useVereditoMistura';
import { NIVEL_BLOQUEIO_MISTURA, ROTULO_NIVEL, piorNivelContra } from '../compat/avaliarMistura';

// Seletor de classes de reatividade da mistura — o backend bloqueia pares Perigo/Proibido na matriz
function ClassesSelector({ idPrefix, value, onChange, veredito, obrigatorio = false }) {
  const toggle = (n) =>
    onChange(value.includes(n) ? value.filter(c => c !== n) : [...value, n]);
  return (
    <div className="form-row full">
      <div className="field">
        <span className="field-label" id={`${idPrefix}-classes-legenda`}>Classes de reatividade da mistura{obrigatorio ? ' *' : ''}</span>
        <div role="group" aria-labelledby={`${idPrefix}-classes-legenda`} className="classe-chip-grid">
          {Object.entries(REATIVIDADE_CLASSES).map(([n, label]) => {
            const classe = Number(n);
            const marcada = value.includes(classe);
            const nivelContraMarcadas = !marcada && veredito.matrix
              ? piorNivelContra(classe, value, veredito.matrix)
              : 0;
            const conflita = nivelContraMarcadas >= NIVEL_BLOQUEIO_MISTURA;
            return (
              <label key={n} htmlFor={`${idPrefix}-classe-${n}`}
                className={`classe-chip${marcada ? ' sel' : ''}${conflita ? ' conflita' : ''}`}>
                <input id={`${idPrefix}-classe-${n}`} type="checkbox"
                  checked={marcada} onChange={() => toggle(classe)} />
                <span className="classe-chip-nome">{n}. {label}</span>
                {conflita && (
                  <>
                    <Icon name="warning" size={13} />
                    <span className="sr-only">: {ROTULO_NIVEL[nivelContraMarcadas].toLowerCase()} com as classes marcadas</span>
                  </>
                )}
              </label>
            );
          })}
        </div>
        {obrigatorio && value.length === 0 && (
          <div className="small muted" style={{ marginTop: 6 }}>
            Selecione ao menos uma classe — é ela que determina quais misturas o sistema bloqueia.
          </div>
        )}
        <VereditoMistura id={`${idPrefix}-veredito`} classes={value} veredito={veredito} />
      </div>
    </div>
  );
}

function nomeDaClasse(classe) {
  return `${classe}. ${REATIVIDADE_CLASSES[classe]}`;
}

function VereditoMistura({ id, classes, veredito }) {
  return (
    <div id={id} className="veredito-mistura" role="status" aria-live="polite">
      {new Set(classes).size >= 2 && <ConteudoVeredito veredito={veredito} />}
    </div>
  );
}

function ConteudoVeredito({ veredito }) {
  const { pior, consultando, indisponivel, perigoso, bloqueia } = veredito;
  if (indisponivel) {
    return (
      <div className="small muted">
        Não foi possível consultar a matriz de compatibilidade agora. O servidor ainda confere a mistura ao registrar.
      </div>
    );
  }
  if (consultando || !pior) {
    return <div className="small muted">Consultando a matriz de compatibilidade…</div>;
  }
  const par = `${nomeDaClasse(pior.classeA)} × ${nomeDaClasse(pior.classeB)}`;
  if (pior.nivel === 0) {
    return (
      <div className="compat-result compact ok">
        <Icon name="check" size={16} stroke={2} />
        <div>
          <div className="res-title">Mistura compatível</div>
          <div className="res-detalhe">Nenhum par entre as classes marcadas tem restrição na matriz.</div>
        </div>
      </div>
    );
  }
  if (!perigoso) {
    return (
      <div className="compat-result compact warn">
        <Icon name="warning" size={16} stroke={2} />
        <div>
          <div className="res-title">Cautela: {par}</div>
          <div className="res-detalhe">O registro é aceito. Confira a composição antes de juntar os resíduos no mesmo recipiente.</div>
        </div>
      </div>
    );
  }
  return (
    <div className="compat-result compact danger">
      <Icon name="warning" size={16} stroke={2} />
      <div>
        <div className="res-title">{ROTULO_NIVEL[pior.nivel]}: {par}</div>
        <div className="res-detalhe">
          {bloqueia
            ? 'Estas classes não podem ir no mesmo recipiente, e o sistema recusa o registro. Separe os resíduos e registre cada um, ou desmarque uma das classes do par.'
            : 'Esta classificação foi gravada antes da regra atual e continua editável nos outros campos. Se alterar as classes, a nova combinação precisa ser permitida.'}
        </div>
      </div>
    </div>
  );
}

// ---------- Novo Resíduo ----------
export function FormNovoResiduo({ onClose, dispatch, inicial = null }) {
  const criarResiduo = useCriarResiduo();
  const { laboratorios: labs, isPending: labsPendentes } = useLaboratoriosDoUsuario();
  const idsPermitidos = labs.map(l => l.id).join(',');
  const semLaboratorio = !labsPendentes && labs.length === 0;
  const [f, setF] = useState({
    tipo: inicial?.tipo || TIPOS_RESIDUO[0],
    volume: inicial?.volume ?? '', unidade: inicial?.unidade || 'L',
    laboratorioId: inicial?.laboratorioId || '', composicao: inicial?.composicao || '', risco: inicial?.risco || 'medio',
    classes: [],
  });

  const [erros, setErros] = useState({});

  useEffect(() => {
    if (labsPendentes) return;
    const permitidos = idsPermitidos ? idsPermitidos.split(',') : [];
    const escolhaForcada = permitidos.length === 1 ? permitidos[0] : '';
    setF(s => {
      if (permitidos.includes(s.laboratorioId) || s.laboratorioId === escolhaForcada) return s;
      return { ...s, laboratorioId: escolhaForcada };
    });
  }, [labsPendentes, idsPermitidos]);

  const upd = (k, v) => setF(s => ({ ...s, [k]: v }));
  const veredito = useVereditoMistura(f.classes);

  const submit = () => {
    if (veredito.bloqueia) return;
    const pendentes = {};
    if (!f.volume) pendentes.volume = 'Informe o volume.';
    if (!f.composicao) pendentes.composicao = 'Descreva a composição.';
    if (!f.laboratorioId) pendentes.laboratorioId = 'Selecione o laboratório.';
    setErros(pendentes);
    if (Object.keys(pendentes).length > 0) return;
    criarResiduo.mutate(
      {
        Descricao: f.composicao.slice(0, 80),
        LaboratorioId: f.laboratorioId,
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
    <Modal title="Registrar resíduo" sub="A solicitação segue para aprovação antes da coleta"
      onClose={onClose} width={620}
      footer={<>
        <button type="button" className="btn btn-sm" onClick={onClose}>Cancelar</button>
        <button type="button" className="btn btn-primary btn-sm" onClick={submit}
          disabled={criarResiduo.isPending || f.classes.length === 0 || veredito.bloqueia || semLaboratorio || labsPendentes}
          aria-describedby={veredito.bloqueia ? 'residuo-veredito' : undefined}>
          {criarResiduo.isPending ? 'Salvando…' : 'Registrar resíduo'}
        </button>
      </>}>
      <div className="form-row">
        <div className="field"><label htmlFor="residuo-tipo">Tipo de resíduo *</label>
          <select id="residuo-tipo" value={f.tipo} onChange={e => upd('tipo', e.target.value)}>
            {TIPOS_RESIDUO.map(t => <option key={t}>{t}</option>)}
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
          {erros.volume && <div className="field-error">{erros.volume}</div>}
        </div>
        <div className="field"><label htmlFor="residuo-lab">Laboratório *</label>
          <select id="residuo-lab" value={f.laboratorioId} onChange={e => upd('laboratorioId', e.target.value)}
            disabled={labs.length === 1}>
            <option value="">Selecione…</option>
            {labs.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
          </select>
          {semLaboratorio && <div className="field-error">Sua conta não responde por nenhum laboratório. Peça a um responsável para atribuir um.</div>}
          {erros.laboratorioId && <div className="field-error">{erros.laboratorioId}</div>}
        </div>
      </div>
      <div className="form-row full">
        <div className="field"><label htmlFor="residuo-composicao">Composição declarada *</label>
          <textarea id="residuo-composicao" rows={3} value={f.composicao} onChange={e => upd('composicao', e.target.value)}
            placeholder="Ex: 60% acetona + 30% etanol + traços de HCl, pH 6" />
          {erros.composicao && <div className="field-error">{erros.composicao}</div>}
        </div>
      </div>
      <ClassesSelector idPrefix="residuo" value={f.classes} onChange={v => upd('classes', v)} veredito={veredito} obrigatorio />
      <div className="residuo-warning-banner">
        <Icon name="warning" size={14} />
        <span>O registro entra como solicitação de descarte e aguarda aprovação antes de ir para a coleta.</span>
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
  const veredito = useVereditoMistura(f.classes, residuo.classes ?? []);

  const submit = () => {
    if (veredito.bloqueia) return;
    if (!f.volume || !f.composicao) { alert('Volume e composição são obrigatórios.'); return; }
    atualizarResiduo.mutate(
      {
        id: residuo.id, Tipo: f.tipo, Volume: Number(f.volume), Unidade: f.unidade,
        Composicao: f.composicao, Risco: f.risco,
        ...(f.classes.length > 0 ? { ClassesReatividade: f.classes } : {}),
      },
      { onSuccess: () => { dispatch({ type: 'refresh' }); onClose(); } }
    );
  };

  return (
    <Modal title="Editar resíduo" sub={`Resíduo #${residuo.id}`}
      onClose={onClose} width={560}
      footer={<>
        <button type="button" className="btn btn-sm" onClick={onClose}>Cancelar</button>
        <button type="button" className="btn btn-primary btn-sm" onClick={submit} disabled={atualizarResiduo.isPending || (f.classes.length === 0 && (residuo.classes?.length ?? 0) > 0) || veredito.bloqueia}
          aria-describedby={veredito.bloqueia ? 'edit-veredito' : undefined}>
          {atualizarResiduo.isPending ? 'Salvando…' : 'Salvar alterações'}
        </button>
      </>}>
      <div className="form-row">
        <div className="field"><label htmlFor="edit-tipo">Tipo</label>
          <select id="edit-tipo" value={f.tipo} onChange={e => upd('tipo', e.target.value)}>
            {TIPOS_RESIDUO.map(t => <option key={t}>{t}</option>)}
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
            <select style={{ width: 80 }} aria-label="Unidade" value={f.unidade} onChange={e => upd('unidade', e.target.value)}>
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
      <ClassesSelector idPrefix="edit" value={f.classes} onChange={v => upd('classes', v)} veredito={veredito} />
    </Modal>
  );
}

// ---------- Rejeitar descarte ----------
export function ConfirmRejeitarResiduo({ residuo, onClose, dispatch }) {
  const rejeitar = useRejeitarResiduo();
  const [motivo, setMotivo] = useState('');
  const motivoInformado = motivo.trim();
  const submit = () => {
    if (!motivoInformado) return;
    rejeitar.mutate(
      { id: residuo.id, motivo: motivoInformado },
      { onSuccess: () => { dispatch({ type: 'refresh' }); onClose(); } }
    );
  };
  return (
    <Modal title="Rejeitar descarte" sub={`Resíduo #${residuo.id} · ${residuo.tipo}`} onClose={onClose} width={480}
      footer={<>
        <button type="button" className="btn btn-sm" onClick={onClose}>Cancelar</button>
        <button type="button" className="btn btn-danger btn-sm" onClick={submit}
          disabled={rejeitar.isPending || !motivoInformado} aria-describedby="rejeitar-motivo-ajuda">
          {rejeitar.isPending ? 'Rejeitando…' : 'Rejeitar descarte'}
        </button>
      </>}>
      <div className="field">
        <label htmlFor="rejeitar-motivo">Motivo *</label>
        <textarea id="rejeitar-motivo" rows={3} maxLength={1000} value={motivo} onChange={e => setMotivo(e.target.value)}
          aria-describedby="rejeitar-motivo-ajuda"
          placeholder="Ex.: pH fora da faixa aceita pelo destinador; neutralize antes de registrar de novo."/>
        <div id="rejeitar-motivo-ajuda" className="small muted" style={{ marginTop: 6 }}>
          Aparece na lista de resíduos, na linha deste descarte, para quem o registrou. A rejeição não pode ser desfeita.
        </div>
      </div>
    </Modal>
  );
}

// ---------- Novo manifesto ----------
export function FormNovoMtr({ onClose, dispatch }) {
  const criarMtr = useCriarMtr();
  const { data: cfg } = useConfigPgrs();
  const { data: residuos = [] } = useResíduos({ status: 'aguardando-coleta' });
  const [selected, setSelected] = useState([]);
  const [f, setF] = useState({ transp: '', dest: '', codigo: '', gerador: '' });

  useEffect(() => {
    if (!cfg) return;
    setF(s => ({
      transp: s.transp || (cfg.transportadorPadrao ?? ''),
      dest: s.dest || (cfg.destinadorPadrao ?? ''),
      codigo: s.codigo || (cfg.codigoIbamaPadrao ?? ''),
      gerador: s.gerador || (cfg.geradorPadrao ?? ''),
    }));
  }, [cfg]);

  const toggle = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const quantidade = quantidadesResiduos(
    selected.map(id => residuos.find(r => r.id === id)).filter(Boolean)
  );

  const submit = () => {
    if (selected.length === 0) { alert('Selecione ao menos um resíduo.'); return; }
    if (!f.gerador.trim() || !f.transp.trim()) { alert('Informe gerador e transportador.'); return; }
    criarMtr.mutate(
      { Gerador: f.gerador, Transportadora: f.transp, Destinador: f.dest, CodigoIbama: f.codigo, ResiduoIds: selected },
      { onSuccess: () => { dispatch({ type: 'refresh' }); onClose(); } }
    );
  };

  return (
    <Modal title="Novo manifesto" sub="Consolida resíduos aprovados para transporte e destinação"
      onClose={onClose} width={680}
      footer={<>
        <button type="button" className="btn btn-sm" onClick={onClose}>Cancelar</button>
        <button type="button" className="btn btn-primary btn-sm" onClick={submit} disabled={criarMtr.isPending}>
          {criarMtr.isPending ? 'Criando…' : `Emitir manifesto (${selected.length})`}
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
          <input id="mtr-transportador" value={f.transp} onChange={e => setF(s => ({ ...s, transp: e.target.value }))} />
        </div>
        <div className="field"><label htmlFor="mtr-destinador">Destinador</label>
          <input id="mtr-destinador" value={f.dest} onChange={e => setF(s => ({ ...s, dest: e.target.value }))} />
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
          Quantidade selecionada: <strong>{formatarQuantidade(quantidade)}</strong> ({selected.length} resíduos)
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
  const total = (mtr.residuo_ids ?? []).length;
  const foraDoEscopo = total - residuos.length;
  return (
    <Modal title={`Pré-visualização · ${mtr.numero}`} sub="Manifesto de uso interno — não substitui o MTR oficial emitido pelo órgão ambiental"
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
                Manifesto de Transporte de Resíduos (uso interno)
              </div>
              <div style={{fontSize: 12, color: '#444', marginTop: 2}}>
                Sistema de gestão ResQui
              </div>
            </div>
            <div style={{textAlign: 'right'}}>
              <div style={{fontSize: 12, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em'}}>Nº do manifesto</div>
              <div style={{fontFamily: 'Courier, monospace', fontSize: 13, fontWeight: 700, marginTop: 2}}>{mtr.numero}</div>
            </div>
          </div>

          {/* Barra de status */}
          <div className="mtr-status-bar">
            Documento de uso interno · não substitui o MTR oficial emitido pelo órgão ambiental
          </div>

          {/* Seção 1 - Dados do manifesto */}
          <SectionMtr num="1" title="DADOS DO MANIFESTO">
            <RowMtr label="Data de emissão" value={emissao}/>
            <RowMtr label="Gerador" value={mtr.gerador}/>
            <RowMtr label="Transportadora" value={mtr.transportadora}/>
            <RowMtr label="Destinador" value={mtr.destinador || '—'}/>
            <RowMtr label="Código IBAMA" value={mtr.codigo_ibama || '—'} mono/>
            <RowMtr label="Quantidade total" value={formatarQuantidade({ litros: mtr.total_litros, quilos: mtr.total_quilos })} mono/>
          </SectionMtr>

          {/* Seção 2 - Resíduos */}
          <SectionMtr num="2" title={`RESÍDUOS (${foraDoEscopo > 0 ? `${residuos.length} de ${total}` : residuos.length})`}>
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
                {foraDoEscopo > 0 && (
                  <tr><td style={mtrTd} colSpan={6}>
                    Mais {foraDoEscopo} resíduo(s) de laboratórios pelos quais você não responde — eles entram na quantidade total acima e saem no PDF.
                  </td></tr>
                )}
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
            ResQui · manifesto de uso interno — não substitui o MTR oficial. Emita o manifesto
            oficial no sistema do órgão ambiental competente.
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ---------- Confirmar destinação ----------
export function FormConfirmarDestinacao({ mtr, residuos, onClose }) {
  const confirmar = useConfirmarDestinacao();
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const emColeta = (residuos ?? []).filter(r => r.status === 'em-coleta');
  const listaCompleta = (residuos ?? []).length === (mtr.residuo_ids ?? []).length;

  const submit = () => confirmar.mutate({ id: mtr.id, data }, { onSuccess: onClose });

  return (
    <Modal title="Confirmar destinação" sub={`${mtr.numero} · encerra os resíduos deste manifesto`}
      onClose={onClose} width={460}
      footer={<>
        <button type="button" className="btn btn-sm" onClick={onClose}>Cancelar</button>
        <button type="button" className="btn btn-primary btn-sm" onClick={submit} disabled={confirmar.isPending}>
          {confirmar.isPending ? 'Salvando…' : 'Confirmar'}
        </button>
      </>}>
      <div className="field">
        <label htmlFor="destinacao-data">Data da destinação</label>
        <input id="destinacao-data" type="date" value={data} onChange={e => setData(e.target.value)} />
      </div>
      <p className="small muted" style={{ marginTop: 10 }}>
        {listaCompleta
          ? `${emColeta.length} resíduo(s) em coleta serão marcados como destinados.`
          : 'Todos os resíduos deste manifesto que estiverem em coleta serão marcados como destinados — inclusive os de laboratórios que você não vê nesta lista.'}
      </p>
    </Modal>
  );
}

// ---------- Reabrir manifesto destinado ----------
export function ConfirmReabrirDestinacao({ mtr, residuos, onClose }) {
  const reabrir = useReabrirDestinacao();
  const destinados = (residuos ?? []).filter(r => r.status === 'destinado').length;
  const listaCompleta = (residuos ?? []).length === (mtr.residuo_ids ?? []).length;

  return (
    <Modal title={`Reabrir ${mtr.numero}?`} sub="Desfaz o registro de destinação deste manifesto."
      onClose={onClose} width={460}
      footer={<>
        <button type="button" className="btn btn-sm" onClick={onClose}>Cancelar</button>
        <button type="button" className="btn btn-sm" disabled={reabrir.isPending}
          onClick={() => reabrir.mutate(mtr.id, { onSuccess: onClose })}>
          {reabrir.isPending ? 'Reabrindo…' : 'Reabrir'}
        </button>
      </>}>
      <p className="small">
        {listaCompleta
          ? `${destinados} resíduo(s) voltam para "em coleta"`
          : 'Todos os resíduos destinados deste manifesto voltam para "em coleta" — inclusive os de laboratórios que você não vê nesta lista'}
        {' '}e a data de destinação ({mtr.data_destinacao}) é apagada. A reabertura fica registrada na auditoria.
      </p>
    </Modal>
  );
}

// ---------- Configurar PGRS (Lei 12.305/10 art. 21) ----------

export function FormConfigurarPgrs({ onClose }) {
  const { data: cfgApi, isPending, isError, refetch } = useConfigPgrs();
  const salvar = useSalvarConfigPgrs();
  const [f, setF] = useState(null);
  const [conflito, setConflito] = useState(null);

  const povoar = cfg => setF({
    razaoSocial: cfg.razaoSocial ?? '', cnpj: cfg.cnpj ?? '',
    endereco: cfg.endereco ?? '', unidade: cfg.unidade ?? '',
    respTecnico: cfg.respTecnico ?? '', respCrq: cfg.respCrq ?? '',
    respEmail: cfg.respEmail ?? '', respTel: cfg.respTel ?? '',
    geradorPadrao: cfg.geradorPadrao ?? '', transportadorPadrao: cfg.transportadorPadrao ?? '',
    destinadorPadrao: cfg.destinadorPadrao ?? '', codigoIbamaPadrao: cfg.codigoIbamaPadrao ?? '',
  });

  useEffect(() => { if (cfgApi) povoar(cfgApi); }, [cfgApi]);

  const set = (k, v) => setF(s => ({ ...s, [k]: v }));

  const submit = () => {
    salvar.mutate({
      RazaoSocial: f.razaoSocial, Cnpj: f.cnpj, Endereco: f.endereco, Unidade: f.unidade,
      RespTecnico: f.respTecnico, RespCrq: f.respCrq, RespEmail: f.respEmail, RespTel: f.respTel,
      GeradorPadrao: f.geradorPadrao, TransportadorPadrao: f.transportadorPadrao,
      DestinadorPadrao: f.destinadorPadrao, CodigoIbamaPadrao: f.codigoIbamaPadrao,
      AtualizadoEmEsperado: cfgApi?.atualizadoEm ?? null,
    }, {
      onSuccess: onClose,
      onError: e => { if (e.status === 409) setConflito(e.message); },
    });
  };

  return (
    <Modal title="Configurar PGRS" sub="Dados institucionais usados no relatório PGRS e como padrão do novo manifesto"
      onClose={onClose} width={680}
      footer={<>
        <button type="button" className="btn btn-sm" onClick={onClose}>Cancelar</button>
        <button type="button" className="btn btn-primary btn-sm" onClick={submit} disabled={!f || salvar.isPending}>
          <Icon name="check" size={12}/> {salvar.isPending ? 'Salvando…' : 'Salvar configuração'}
        </button>
      </>}>
      {isPending && <div className="page-loading"><Icon name="refresh" size={16}/> Carregando...</div>}
      {isError && <div className="page-error">Erro ao carregar dados. <button onClick={refetch}>Tentar novamente</button></div>}
      {f && (
        <>
          {conflito && (
            <div className="page-error" style={{marginBottom: 12}}>
              <Icon name="warning" size={14}/> {conflito}
              <button type="button" className="btn btn-sm" style={{marginLeft: 8}}
                onClick={async () => {
                  const { data } = await refetch();
                  if (data) povoar(data);
                  setConflito(null);
                }}>Recarregar</button>
            </div>
          )}
          <div className="form-hint">Identificação do empreendimento (Lei 12.305/10, art. 21, inc. I). Campos em branco são omitidos do relatório.</div>
          <div className="form-row full">
            <div className="field"><label htmlFor="pgrs-razao-social">Razão social</label>
              <input id="pgrs-razao-social" aria-label="Razão social" value={f.razaoSocial} onChange={e => set('razaoSocial', e.target.value)}/></div>
          </div>
          <div className="form-row">
            <div className="field"><label htmlFor="pgrs-cnpj">CNPJ</label>
              <input id="pgrs-cnpj" aria-label="CNPJ" value={f.cnpj} onChange={e => set('cnpj', e.target.value)} className="mono"/></div>
            <div className="field"><label htmlFor="pgrs-unidade">Unidade geradora</label>
              <input id="pgrs-unidade" aria-label="Unidade geradora" value={f.unidade} onChange={e => set('unidade', e.target.value)}/></div>
          </div>
          <div className="form-row full">
            <div className="field"><label htmlFor="pgrs-endereco">Endereço</label>
              <input id="pgrs-endereco" aria-label="Endereço" value={f.endereco} onChange={e => set('endereco', e.target.value)}/></div>
          </div>

          <div className="form-sub-label">Responsável técnico</div>
          <div className="form-row">
            <div className="field"><label htmlFor="pgrs-resp-nome">Nome</label>
              <input id="pgrs-resp-nome" aria-label="Nome do responsável técnico" value={f.respTecnico} onChange={e => set('respTecnico', e.target.value)}/></div>
            <div className="field"><label htmlFor="pgrs-resp-crq">Registro CRQ</label>
              <input id="pgrs-resp-crq" aria-label="Registro CRQ" value={f.respCrq} onChange={e => set('respCrq', e.target.value)} className="mono"/></div>
          </div>
          <div className="form-row">
            <div className="field"><label htmlFor="pgrs-resp-email">E-mail</label>
              <input id="pgrs-resp-email" aria-label="E-mail do responsável técnico" value={f.respEmail} onChange={e => set('respEmail', e.target.value)} className="mono"/></div>
            <div className="field"><label htmlFor="pgrs-resp-tel">Telefone</label>
              <input id="pgrs-resp-tel" aria-label="Telefone do responsável técnico" value={f.respTel} onChange={e => set('respTel', e.target.value)} className="mono"/></div>
          </div>

          <div className="form-sub-label">Padrões do manifesto</div>
          <div className="form-hint">Preenchem os campos do novo manifesto; seguem editáveis a cada emissão.</div>
          <div className="form-row">
            <div className="field"><label htmlFor="pgrs-gerador">Gerador padrão</label>
              <input id="pgrs-gerador" aria-label="Gerador padrão" value={f.geradorPadrao} onChange={e => set('geradorPadrao', e.target.value)}/></div>
            <div className="field"><label htmlFor="pgrs-codigo-ibama">Código IBAMA padrão</label>
              <input id="pgrs-codigo-ibama" aria-label="Código IBAMA padrão" value={f.codigoIbamaPadrao} onChange={e => set('codigoIbamaPadrao', e.target.value)} className="mono"/></div>
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
