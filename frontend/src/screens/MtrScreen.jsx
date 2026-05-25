import { useState } from 'react';
import { Icon, Tag, SectionTitle, mtrStatusBadge } from '../components';
import { MTRS, RESIDUOS, AUDITORIA } from '../data';
import { pgrsTs, logAudit } from '../utils';

// Garante que o rascunho em edição apareça na tabela.
(function ensureDraftMtr() {
  if (!MTRS.some(m => m.id === 'MTR-2025-1143')) {
    MTRS.unshift({
      id: 'MTR-2025-1143', emissao: '2025-11-22', status: 'rascunho',
      transportador: 'EcoLog Transportes', destinador: 'EcoQuímica SA',
      residuos: ['W-0451', 'W-0452', 'W-0454'], massa: 8.3, codigo_ibama: 'A099',
    });
  }
})();

export function MtrScreen({ state, dispatch }) {
  const [savedAt, setSavedAt] = useState(null);
  const [selectedId, setSelectedId] = useState('MTR-2025-1143');
  const sel = MTRS.find(m => m.id === selectedId) || MTRS[0];

  const saveDraft = () => {
    const tsStr = pgrsTs();
    const hhmm = tsStr.slice(11, 16);
    const mtr = MTRS.find(m => m.id === sel.id);
    if (mtr) mtr.ultima_edicao = tsStr.slice(0, 16);
    AUDITORIA.unshift({
      ts: tsStr,
      who: 'Lucas Souza', what: 'mtr.draft', where: '-',
      detail: `Atualizou rascunho ${sel.id} (${sel.residuos.length} resíduos)`,
      risk: 'low',
    });
    setSavedAt(hhmm);
    dispatch({ type: 'refresh' });
  };

  const isDraft = sel.status === 'rascunho';

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Pré-MTR · SINIR</h1>
          <p className="page-sub">Manifesto de Transporte de Resíduos · Resolução ANTT 5947/21 · integração SINIR/IBAMA</p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-sm" onClick={() => {
            const prontos = MTRS.filter(m => m.status === 'rascunho' && m.transportador && m.destinador && m.codigo_ibama);
            if (prontos.length === 0) {
              alert('Nenhum MTR em rascunho está pronto para envio. Preencha transportador, destinador e código IBAMA primeiro.');
              return;
            }
            prontos.forEach(m => { m.status = 'pendente-sinir'; m.enviado = pgrsTs().slice(0, 16); });
            logAudit('mtr.sinir.batch', `Enviou ${prontos.length} MTR(s) ao SINIR em lote: ${prontos.map(m => m.id).join(', ')}`, 'med');
            alert(`${prontos.length} MTR(s) enviado(s) ao SINIR. Aguardando confirmação.`);
            dispatch({type: 'refresh'});
          }}><Icon name="upload" size={13} /> Enviar ao SINIR</button>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => dispatch({ type: 'openModal', kind: 'novoMtr' })}>
            <Icon name="plus" size={13} /> Novo Pré-MTR
          </button>
        </div>
      </div>

      <div className="card card-tight" style={{ marginBottom: 16 }}>
        <SectionTitle title="MTRs emitidos" sub={`${MTRS.length} no período · clique para ver detalhes`} />
        <table className="tbl">
          <thead>
            <tr>
              <th>MTR</th><th>Emissão</th><th>Resíduos</th><th className="right">Massa</th>
              <th>Cód. IBAMA</th><th>Transportador</th><th>Destinador</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {MTRS.map((m) =>
            <tr key={m.id} className={m.id === sel.id ? 'selected' : ''} onClick={() => { setSelectedId(m.id); setSavedAt(null); }}>
                <td className="num">{m.id}</td>
                <td className="mono small">{m.emissao}</td>
                <td className="small">{m.residuos.map((r) => <Tag key={r}>{r}</Tag>)}</td>
                <td className="num right">{m.massa.toFixed(1)} kg</td>
                <td className="mono">{m.codigo_ibama}</td>
                <td>{m.transportador}</td>
                <td>{m.destinador}</td>
                <td>{mtrStatusBadge(m.status)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Painel de detalhes — editável se rascunho, somente-leitura caso contrário */}
      <div className="card">
        <SectionTitle
          title={isDraft ? `Pré-MTR em rascunho · ${sel.id}` : `Detalhes do MTR · ${sel.id}`}
          sub={isDraft ? 'Preenchimento assistido com base nos resíduos selecionados' : `Emitido em ${sel.emissao} · documento já submetido`}
          right={mtrStatusBadge(sel.status)} />
        <div className="card-body">
          <div className="form-row">
            <div className="field">
              <label htmlFor="mtr-gerador">Gerador</label>
              <input id="mtr-gerador" aria-label="Gerador" value="UNIFEI · IMC · Lab Química Geral" readOnly />
            </div>
            <div className="field">
              <label htmlFor="mtr-cnpj">CNPJ</label>
              <input id="mtr-cnpj" aria-label="CNPJ do gerador" value="12.345.678/0001-95" readOnly />
            </div>
          </div>
          <div className="form-row">
            <div className="field">
              <label htmlFor="mtr-transportador">Transportador</label>
              {isDraft ? (
                <select id="mtr-transportador" aria-label="Transportador" defaultValue={sel.transportador}>
                  <option>EcoLog Transportes</option>
                  <option>CleanWaste</option>
                </select>
              ) : <input id="mtr-transportador" aria-label="Transportador" value={sel.transportador} readOnly/>}
            </div>
            <div className="field">
              <label htmlFor="mtr-destinador">Destinador</label>
              {isDraft ? (
                <select id="mtr-destinador" aria-label="Destinador" defaultValue={sel.destinador}>
                  <option>EcoQuímica SA</option>
                  <option>Resitec Ambiental</option>
                </select>
              ) : <input id="mtr-destinador" aria-label="Destinador" value={sel.destinador} readOnly/>}
            </div>
          </div>
          <div className="form-row">
            <div className="field">
              <label htmlFor="mtr-ibama">Código IBAMA</label>
              {isDraft ? (
                <select id="mtr-ibama" aria-label="Código IBAMA" defaultValue={sel.codigo_ibama}>
                  <option value="A099">A099 (Resíduos químicos diversos)</option>
                  <option value="A002">A002 (Soluções ácidas)</option>
                  <option value="A007">A007 (Solventes halogenados)</option>
                </select>
              ) : <input id="mtr-ibama" aria-label="Código IBAMA" value={sel.codigo_ibama} readOnly style={{fontFamily: 'var(--mono)'}}/>}
            </div>
            <div className="field">
              <label htmlFor="mtr-tecnologia">Tecnologia de destinação</label>
              {isDraft ? (
                <select id="mtr-tecnologia" aria-label="Tecnologia de destinação" defaultValue="incineracao">
                  <option value="incineracao">Incineração com lavagem de gases (T34)</option>
                  <option value="cofur">Co-processamento em forno de cimento (T40)</option>
                </select>
              ) : <input id="mtr-tecnologia" aria-label="Tecnologia de destinação" value="Incineração com lavagem de gases (T34)" readOnly/>}
            </div>
          </div>

          <div style={{ marginTop: 8 }}>
            <div style={{ display: 'block', fontSize: 12, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', marginBottom: 6 }}>
              Resíduos consolidados ({sel.residuos.length}) · massa total {sel.massa.toFixed(1)} kg
            </div>
            <table className="tbl" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
              <thead>
                <tr><th>ID</th><th>Tipo</th><th className="right">Volume</th><th>Risco</th><th>Gerador</th></tr>
              </thead>
              <tbody>
                {sel.residuos.map(rid => {
                  const r = RESIDUOS.find(x => x.id === rid);
                  if (!r) return <tr key={rid}><td className="num">{rid}</td><td colSpan={4} className="muted">Resíduo não encontrado no inventário</td></tr>;
                  return (
                    <tr key={rid}>
                      <td className="num">{r.id}</td>
                      <td>{r.tipo}</td>
                      <td className="num right">{r.volume} {r.unidade}</td>
                      <td>{r.risco}</td>
                      <td className="mono">{r.gerador}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="row" style={{ marginTop: 14, justifyContent: 'flex-end', gap: 8, alignItems: 'center' }}>
            {savedAt && (
              <span style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--text-3)', marginRight: 'auto' }}>
                ✓ Rascunho salvo às {savedAt}
              </span>
            )}
            {isDraft ? (
              <>
                <button type="button" className="btn btn-sm" onClick={saveDraft}>Salvar rascunho</button>
                <button type="button" className="btn btn-sm" onClick={() => dispatch({ type: 'openModal', kind: 'previewMtrPdf' })}><Icon name="download" size={12} /> Pré-visualizar PDF</button>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => {
                  if (!sel.transportador || !sel.destinador || !sel.codigo_ibama) {
                    alert('Preencha transportador, destinador e código IBAMA antes de enviar.');
                    return;
                  }
                  sel.status = 'pendente-sinir';
                  sel.enviado = pgrsTs().slice(0, 16);
                  logAudit('mtr.sinir.send', `Validou e enviou ${sel.id} ao SINIR (${sel.residuos.length} resíduos · ${sel.massa.toFixed(1)} kg)`, 'med');
                  alert(`${sel.id} enviado ao SINIR. Status agora: Pendente SINIR.`);
                  dispatch({type: 'refresh'});
                }}><Icon name="upload" size={12} /> Validar e enviar ao SINIR</button>
              </>
            ) : (
              <>
                <button type="button" className="btn btn-sm" onClick={() => dispatch({ type: 'openModal', kind: 'previewMtrPdf' })}><Icon name="download" size={12} /> Baixar PDF</button>
                <button type="button" className="btn btn-sm" onClick={() => {
                  logAudit('mtr.reprint', `Re-imprimiu ${sel.id}`);
                  dispatch({ type: 'openModal', kind: 'previewMtrPdf' });
                }}><Icon name="clipboard" size={12} /> Re-imprimir</button>
                {sel.status === 'aceito-sinir' && (
                  <button type="button" className="btn btn-sm" onClick={() => {
                    logAudit('mtr.sinir.view', `Abriu ${sel.id} no portal SINIR`);
                    window.open('https://sinir.gov.br/consulta?mtr=' + sel.id, '_blank');
                  }}><Icon name="upload" size={12} /> Ver no SINIR</button>
                )}
                {sel.status === 'pendente-sinir' && (
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => {
                    const sucesso = Math.random() < 0.7;
                    if (sucesso) {
                      sel.status = 'aceito-sinir';
                      logAudit('mtr.sinir.retry', `Reenvio de ${sel.id} aceito pelo SINIR`, 'low');
                      alert(`${sel.id} aceito pelo SINIR.`);
                    } else {
                      logAudit('mtr.sinir.retry', `Reenvio de ${sel.id} falhou (timeout)`, 'med');
                      alert(`Falha ao reenviar ${sel.id}: timeout do SINIR. Tente novamente em alguns minutos.`);
                    }
                    dispatch({type: 'refresh'});
                  }}><Icon name="refresh" size={12} /> Reenviar ao SINIR</button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>);

}
