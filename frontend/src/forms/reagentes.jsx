import { useState, useRef, useId } from 'react';
import { Icon, Badge, Tag, Picto } from '../components';
import { REATIVIDADE_CLASSES, PICTOS_GHS } from '../data';
import { useCriarReagente } from '../reagentes/useCriarReagente';
import { useBaixaReagente } from '../reagentes/useBaixaReagente';
import { useTransferirReagente } from '../reagentes/useTransferirReagente';
import { useLocais } from '../laboratorios/useLocais';
import { useUsuarios } from '../usuarios/useUsuarios';
import Modal from './Modal';
import { useCompatOverrides } from '../compat/useCompatOverrides';
import { useSalvarCompatOverride } from '../compat/useSalvarCompatOverride';
import { useRemoverCompatOverride } from '../compat/useRemoverCompatOverride';
import { useToast } from '../components/ToastContext';
import { useAuth } from '../auth/AuthContext';
import { useImportarReagentes } from '../reagentes/useImportarReagentes';
import { parseCsv, analisarImportacao, mapearColunas } from '../lib/csv';

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
  const { locais, isPending: locaisPending, isError: locaisError } = useLocais();
  const { data: usuarios = [], isPending: usuariosPending, isError: usuariosError } = useUsuarios();
  const responsaveis = usuarios.filter(u => u.status === 'ativo').sort((a, b) => a.nome.localeCompare(b.nome));
  const [f, setF] = useState({
    nome: '', sinonimo: '', cas: '', formula: '', classe: 1,
    estoque: '', unidade: 'L', validade: '', local: '',
    responsavel: '', controlado: false, lote: '',
    pictos: [], signal: 'Atenção',
    h: '', p: '',
  });
  const [erros, setErros] = useState({});
  const upd = (k, v) => setF(s => ({...s, [k]: v}));
  const togglePicto = (p) => setF(s => ({...s, pictos: s.pictos.includes(p) ? s.pictos.filter(x => x !== p) : [...s.pictos, p]}));

  const submit = () => {
    const pendentes = {};
    if (!f.nome) pendentes.nome = 'Informe o nome do reagente.';
    if (!f.cas) pendentes.cas = 'Informe o número CAS.';
    setErros(pendentes);
    if (Object.keys(pendentes).length > 0) return;
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
      <div className="form-section-title">Identificação</div>
      <div className="form-row">
        <div className="field"><label htmlFor={ids.nome}>Nome *</label><input id={ids.nome} aria-label="Nome do reagente" value={f.nome} onChange={e => upd('nome', e.target.value)} placeholder="ex: Ácido Acético"/>
          {erros.nome && <div className="field-error">{erros.nome}</div>}
        </div>
        <div className="field"><label htmlFor={ids.sinonimo}>Sinônimo / nome comercial</label><input id={ids.sinonimo} aria-label="Sinônimo ou nome comercial do reagente" value={f.sinonimo} onChange={e => upd('sinonimo', e.target.value)} placeholder="ex: CH3COOH glacial"/></div>
      </div>
      <div className="form-row">
        <div className="field"><label htmlFor={ids.cas}>CAS *</label><input id={ids.cas} aria-label="Número CAS do reagente" value={f.cas} onChange={e => upd('cas', e.target.value)} placeholder="64-19-7"/>
          {erros.cas && <div className="field-error">{erros.cas}</div>}
        </div>
        <div className="field"><label htmlFor={ids.formula}>Fórmula</label><input id={ids.formula} aria-label="Fórmula molecular do reagente" value={f.formula} onChange={e => upd('formula', e.target.value)} placeholder="C2H4O2"/></div>
      </div>

      <div className="form-section-title">Estoque e localização</div>
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
          <select id={ids.local} value={f.local} onChange={e => upd('local', e.target.value)} disabled={locaisPending}>
            <option value="">{locaisPending ? 'Carregando…' : locaisError ? 'Erro ao carregar' : 'Selecione…'}</option>
            {locais.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div className="field"><label htmlFor={ids.responsavel}>Responsável</label>
          <select id={ids.responsavel} value={f.responsavel} onChange={e => upd('responsavel', e.target.value)} disabled={usuariosPending}>
            <option value="">{usuariosPending ? 'Carregando…' : usuariosError ? 'Erro ao carregar' : 'Selecione…'}</option>
            {responsaveis.map(u => <option key={u.id ?? u.email ?? u.nome} value={u.nome}>{u.nome}</option>)}
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="field"><label htmlFor={ids.lote}>Lote</label><input id={ids.lote} aria-label="Número do lote do reagente" value={f.lote} onChange={e => upd('lote', e.target.value)} placeholder="L-1234-A"/></div>
      </div>

      <div className="form-section-title">Segurança</div>
      <div className="form-row">
        <div className="field"><label htmlFor={ids.classe}>Classe de reatividade</label>
          <select id={ids.classe} value={f.classe} onChange={e => upd('classe', e.target.value)}>
            {Object.entries(REATIVIDADE_CLASSES).map(([k, v]) => <option key={k} value={k}>{k}. {v}</option>)}
          </select>
          <div className="small muted" style={{ marginTop: 4 }}>Determina quais misturas o sistema bloqueia.</div>
        </div>
        <div className="field" style={{display: 'flex', alignItems: 'flex-end'}}>
          <label htmlFor={ids.controlado} style={{display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer'}}>
            <input id={ids.controlado} aria-label="Marcar se o reagente é controlado pela Polícia Federal ou Exército" type="checkbox" checked={f.controlado} onChange={e => upd('controlado', e.target.checked)}/>
            Reagente controlado (PF / Exército)
          </label>
        </div>
      </div>

      <details className="ghs-details">
        <summary>Classificação GHS (opcional)</summary>
        <div className="form-row">
          <div className="field"><label htmlFor={ids.signal}>Palavra-sinal</label>
            <select id={ids.signal} value={f.signal} onChange={e => upd('signal', e.target.value)}>
              <option>Perigo</option><option>Atenção</option>
            </select>
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
      </details>
    </Modal>
  );
}

// ---------- Baixa de consumo ----------
export function FormBaixa({ reagente, onClose, dispatch, quantidadeInicial }) {
  const uid = useId();
  const ids = {
    quantidade: `${uid}-quantidade`,
    restara: `${uid}-restara`,
    motivo: `${uid}-motivo`,
  };
  const baixaMutation = useBaixaReagente(reagente.id);
  const [q, setQ] = useState(quantidadeInicial ?? '');
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

// ---------- Transferência de local ----------
export function FormTransferirReagente({ reagente, onClose, dispatch }) {
  const uid = useId();
  const ids = { origem: `${uid}-origem`, destino: `${uid}-destino` };
  const transferir = useTransferirReagente(reagente.id);
  const { locais, isPending: locaisPending, isError: locaisError } = useLocais();
  const [destino, setDestino] = useState('');
  const submit = () => {
    if (!destino || destino === reagente.local) {
      alert('Escolha um destino diferente do local atual.');
      return;
    }
    transferir.mutate({ destino }, {
      onSuccess: () => {
        dispatch({ type: 'refresh', flashId: reagente.id });
        onClose();
      },
    });
  };
  return (
    <Modal title="Transferir reagente" sub={`${reagente.nome} · ${reagente.id}`}
      onClose={onClose} width={460}
      footer={<>
        <button type="button" className="btn btn-sm" onClick={onClose}>Cancelar</button>
        <button type="button" className="btn btn-primary btn-sm" onClick={submit} disabled={transferir.isPending}>
          {transferir.isPending ? 'Transferindo…' : 'Confirmar transferência'}
        </button>
      </>}>
      {transferir.isError && (
        <div className="login-err" style={{marginBottom: 12}}>{transferir.error?.message ?? 'Erro ao transferir reagente.'}</div>
      )}
      <div className="form-row full">
        <div className="field"><label htmlFor={ids.origem}>Local atual</label>
          <input id={ids.origem} value={reagente.local} readOnly/>
        </div>
      </div>
      <div className="form-row full">
        <div className="field"><label htmlFor={ids.destino}>Destino *</label>
          <select id={ids.destino} value={destino} onChange={e => setDestino(e.target.value)} disabled={locaisPending}>
            <option value="">{locaisPending ? 'Carregando…' : locaisError ? 'Erro ao carregar' : 'Selecione…'}</option>
            {locais.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      </div>
    </Modal>
  );
}

// ---------- Importar CSV (real) ----------
export function FormImportarCSV({ onClose, dispatch }) {
  const { user } = useAuth();
  const { addToast } = useToast();
  const importar = useImportarReagentes();
  const [step, setStep] = useState('pick');   // pick | review | done
  const [fileName, setFileName] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [itens, setItens] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [resultado, setResultado] = useState(null);
  const fileInputRef = useRef(null);

  const carregarArquivo = (file) => {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const { headers, rows } = parseCsv(String(e.target.result));
      setHeaders(headers);
      setItens(analisarImportacao(headers, rows, { responsavelDefault: user?.nome || '' }));
      setStep('review');
    };
    reader.onerror = () => {
      addToast('Não foi possível ler o arquivo.', 'error');
    };
    reader.readAsText(file);
  };

  const prontas = itens.filter(i => !i.bloqueada);
  const comAviso = prontas.filter(i => i.avisos.length > 0);
  const bloqueadas = itens.filter(i => i.bloqueada);
  const semColunaClasse = headers.length > 0 && !('ClasseReatividade' in mapearColunas(headers));

  const confirmarImport = async () => {
    const res = await importar.mutateAsync(prontas.map(i => i.cmd));
    setResultado(res);
    setStep('done');
  };

  // —————————— STEP: pick ——————————
  if (step === 'pick') {
    return (
      <Modal title="Importar inventário em lote" sub="Carregue um CSV/TSV exportado de planilha (Excel, Google Sheets)"
        onClose={onClose} width={620}
        footer={<button type="button" className="btn btn-sm" onClick={onClose}>Cancelar</button>}>
        <button
          type="button"
          aria-label="Área para arrastar arquivo ou clique para selecionar"
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); carregarArquivo(e.dataTransfer.files[0]); }}
          onClick={() => fileInputRef.current?.click()}
          className="csv-dropzone"
          style={{
            border: '2px dashed ' + (dragOver ? 'var(--accent)' : 'var(--border)'),
            background: dragOver ? 'var(--accent-soft)' : 'var(--surface-2)',
          }}>
          <input ref={fileInputRef} type="file" accept=".csv,.tsv" style={{ display: 'none' }}
            aria-label="Selecionar arquivo CSV ou TSV"
            onChange={e => carregarArquivo(e.target.files[0])} />
          <div style={{ color: 'var(--text-3)', marginBottom: 10, display: 'flex', justifyContent: 'center' }}>
            <Icon name="upload" size={32} />
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
            Arraste o arquivo aqui ou clique para selecionar
          </div>
          <div className="small muted">CSV ou TSV · até 5 MB</div>
        </button>

        <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.55 }}>
          <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--text)' }}>Colunas reconhecidas</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {['Nome*', 'CAS*', 'Quantidade*', 'Unidade*', 'Local*', 'Fórmula', 'Validade', 'Responsável', 'Classe*', 'Controlado'].map(c => (
              <Tag key={c}>{c}</Tag>
            ))}
          </div>
          <div className="small muted" style={{ marginTop: 8 }}>
            Campos com <span className="mono" style={{ color: 'var(--red)' }}>*</span> são obrigatórios. Colunas não reconhecidas são ignoradas.
          </div>
        </div>
      </Modal>
    );
  }

  // —————————— STEP: review ——————————
  if (step === 'review') {
    return (
      <Modal title="Revisar importação" sub={fileName}
        onClose={onClose} width={720}
        footer={<>
          <button type="button" className="btn btn-sm" onClick={() => setStep('pick')}>Voltar</button>
          <button type="button" className="btn btn-primary btn-sm" disabled={prontas.length === 0 || importar.isPending}
            onClick={confirmarImport}>
            {importar.isPending ? 'Importando…' : `Importar ${prontas.length} reagentes`}
          </button>
        </>}>
        {semColunaClasse && (
          <div role="status" style={{
            padding: '10px 12px', marginBottom: 12, fontSize: 12, lineHeight: 1.5,
            border: '1px solid var(--amber)', borderRadius: 'var(--radius)',
            background: 'var(--amber-soft)', color: 'var(--text)',
          }}>
            A planilha não tem coluna de classe de reatividade — cabeçalhos aceitos:{' '}
            <span className="mono">classe</span>, <span className="mono">classereatividade</span>,{' '}
            <span className="mono">reatividade</span>.
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
          <div style={{ padding: 14, border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--green-soft)' }}>
            <div className="small mono" style={{ color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Prontas</div>
            <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--green)' }}>{prontas.length}</div>
          </div>
          <div style={{ padding: 14, border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--amber-soft)' }}>
            <div className="small mono" style={{ color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Com aviso</div>
            <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--amber)' }}>{comAviso.length}</div>
          </div>
          <div style={{ padding: 14, border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface-2)' }}>
            <div className="small mono" style={{ color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Bloqueadas</div>
            <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-2)' }}>{bloqueadas.length} bloqueada{bloqueadas.length === 1 ? '' : 's'}</div>
          </div>
        </div>

        <div style={{ fontSize: 12, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-3)', marginBottom: 8 }}>
          Pré-visualização · {Math.min(20, itens.length)} de {itens.length} linhas
        </div>
        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'auto', maxHeight: 260 }}>
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse', fontFamily: 'var(--mono)' }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)' }}>
                {['Linha', 'Nome', 'CAS', 'Estoque', 'Situação'].map(h => (
                  <th key={h} style={{ padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid var(--border)', fontWeight: 500, color: 'var(--text-3)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {itens.slice(0, 20).map(it => (
                <tr key={it.linhaCsv} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '5px 10px' }} className="muted">{it.linhaCsv}</td>
                  <td style={{ padding: '5px 10px', whiteSpace: 'nowrap' }}>{it.cmd?.Nome || '—'}</td>
                  <td style={{ padding: '5px 10px' }}>{it.cmd?.Cas || '—'}</td>
                  <td style={{ padding: '5px 10px' }}>{it.cmd ? `${it.cmd.Estoque} ${it.cmd.Unidade}` : '—'}</td>
                  <td style={{ padding: '5px 10px' }}>
                    {it.bloqueada
                      ? <Badge kind="gray">{it.motivos.join(', ')}</Badge>
                      : it.avisos.length
                        ? <Badge kind="amber">{it.avisos.join(', ')}</Badge>
                        : <Badge kind="green">OK</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="small muted" style={{ marginTop: 12, lineHeight: 1.55 }}>
          As {prontas.length} linhas prontas serão importadas (as bloqueadas são ignoradas). O servidor valida cada linha e pode reportar erros adicionais.
        </div>
      </Modal>
    );
  }

  // —————————— STEP: done ——————————
  return (
    <Modal title="Importação concluída" sub={fileName}
      onClose={onClose} width={520}
      footer={<>
        <button type="button" className="btn btn-sm" onClick={onClose}>Fechar</button>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => { onClose(); dispatch({ type: 'refresh' }); }}>Ver inventário</button>
      </>}>
      <div style={{ padding: '16px 0', textAlign: 'center' }}>
        <div className="import-done-icon">
          <Icon name="check" size={24} />
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
          {resultado?.importados ?? 0} reagentes importados
        </div>
        <div className="small muted">Evento <span className="mono">reagente.bulk-import</span> registrado na auditoria.</div>
      </div>

      {resultado?.erros?.length > 0 && (
        <>
          <div style={{ fontSize: 12, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-3)', margin: '4px 0 8px' }}>
            {resultado.erros.length} com erro
          </div>
          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'auto', maxHeight: 180 }}>
            {resultado.erros.map(e => (
              <div key={e.indice} style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 10, padding: '8px 12px', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                <span className="mono small muted">Item {e.indice + 1}</span>
                <span>{e.motivo}</span>
              </div>
            ))}
          </div>
        </>
      )}
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
      addToast('Regra salva com sucesso.', 'success');
      setSelected(null);
    } catch (e) {
      addToast(e.message, 'error');
    }
  };

  const handleRemove = async () => {
    if (!selected) return;
    try {
      await remover.mutateAsync({ classeA: selected.a, classeB: selected.b });
      addToast('Regra removida.', 'success');
      setSelected(null);
    } catch (e) {
      addToast(e.message, 'error');
    }
  };

  const handleAdd = (a, b) => {
    setSelected({ a, b, score: 1, motivo: '', autor: '', data: null });
    setShowNew(false);
  };

  return (
    <Modal title="Editar regras de compatibilidade"
      sub="Sobreposições institucionais à matriz baseada no chart EPA-600/2-80-076"
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
                Nenhuma regra. A matriz cai para os níveis do chart EPA-600/2-80-076.
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
        {a === b && (
          <div className="small muted" style={{marginTop: 6}}>
            Uma regra precisa de duas classes diferentes.
          </div>
        )}
        <div style={{display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6}}>
          <button type="button" className="btn btn-sm" onClick={onCancel}>Cancelar</button>
          <button type="button" className="btn btn-primary btn-sm" disabled={a === b}
            onClick={() => onAdd(a, b)}>Adicionar</button>
        </div>
      </div>
    </button>
  );
}
