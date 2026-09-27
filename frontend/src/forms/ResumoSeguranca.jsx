import Modal from './Modal';
import { Icon } from '../components';
import { REATIVIDADE_CLASSES, PICTOS_GHS } from '../data';
import { useCompatMatriz } from '../compat/useCompatMatriz';
import { useIdentificacaoPgrs } from '../pgrs/useIdentificacaoPgrs';

const listaResumo = { margin: '4px 0 0 16px', padding: 0, fontSize: 12, lineHeight: 1.5 };
const rotuloLista = { marginTop: 6, fontSize: 12, color: '#666', textTransform: 'uppercase', letterSpacing: '0.04em' };
const semDado = { fontSize: 12, color: '#666' };

const VALIDADE_LABEL = { ok: 'em dia', vencendo: 'vencendo', vencido: 'vencido' };

function BlocoResumo({ titulo, children }) {
  return (
    <div style={{marginTop: 14}}>
      <div className="resumo-bloco-header">{titulo}</div>
      <div style={{padding: '6px 10px', border: '1px solid #ddd', borderTop: 0}}>{children}</div>
    </div>
  );
}

function LinhaResumo({ label, value, mono }) {
  return (
    <div style={{display: 'grid', gridTemplateColumns: '180px 1fr', padding: '3px 0', fontSize: 12, gap: 8}}>
      <div style={{color: '#666', textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 12, paddingTop: 1}}>{label}</div>
      <div style={{fontFamily: mono ? 'Courier, monospace' : 'inherit'}}>{value}</div>
    </div>
  );
}

// Clona a folha para um portal e imprime só ela — mesmo mecanismo do rótulo GHS e do manifesto.
function imprimirFolha() {
  const original = document.querySelector('.resumo-sheet');
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
    document.getElementById('print-portal')?.remove();
    document.getElementById('mtr-print-page')?.remove();
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);
  setTimeout(() => { window.print(); setTimeout(cleanup, 1000); }, 50);
}

export function ResumoSeguranca({ onClose, reagente }) {
  const { data: matriz, isPending: matrizPendente, isError: matrizErro } = useCompatMatriz();
  // Recorte de identificação, não a configuração inteira: o resumo é aberto por qualquer papel,
  // e GET /api/pgrs-config exige a policy Operacao — pedi-lo aqui devolvia 403 para o Aluno,
  // e a folha saía sem identificar a instituição.
  const { data: cfg } = useIdentificacaoPgrs();
  const r = reagente;
  if (!r) return null;

  const hoje = new Date().toLocaleDateString('pt-BR');
  const instituicao = [cfg?.razaoSocial, cfg?.unidade].filter(Boolean).join(' · ');
  const pictos = r.pictos ?? [];
  const frasesH = r.h ?? [];
  const frasesP = r.p ?? [];
  const semGhs = pictos.length === 0 && frasesH.length === 0 && frasesP.length === 0 && !r.signal;

  const linhaMatriz = matriz?.matrix?.[r.classe] ?? [];
  const classesEmNivel = (n) => linhaMatriz
    .map((nivel, i) => (nivel === n ? i + 1 : 0))
    .filter(c => c && c !== r.classe)
    .map(c => `${c}. ${REATIVIDADE_CLASSES[c]}`);
  const proibidas = classesEmNivel(3);
  const perigosas = classesEmNivel(2);

  return (
    <Modal title={`Resumo de segurança · ${r.nome}`} sub={`${r.id} · CAS ${r.cas}`}
      onClose={onClose} width={920}
      footer={<>
        <button type="button" className="btn btn-sm" onClick={onClose}>Fechar</button>
        <button type="button" className="btn btn-primary btn-sm" onClick={imprimirFolha}>
          <Icon name="clipboard" size={12}/> Imprimir
        </button>
      </>}>
      <div className="resumo-outer-wrapper">
        <div className="resumo-sheet resumo-sheet-inner">
          <div style={{display: 'grid', gridTemplateColumns: '1fr 90px', gap: 14, alignItems: 'center', borderBottom: '2px solid #111', paddingBottom: 12}}>
            <div>
              <div style={{fontSize: 13, fontWeight: 700}}>RESUMO DE SEGURANÇA DO REAGENTE</div>
              {instituicao && <div style={{fontSize: 12, color: '#444', marginTop: 2}}>{instituicao}</div>}
            </div>
            <div style={{textAlign: 'right'}}>
              <div style={{fontSize: 12, color: '#666', textTransform: 'uppercase', letterSpacing: '0.08em'}}>Código interno</div>
              <div style={{fontFamily: 'Courier, monospace', fontSize: 13, fontWeight: 700, marginTop: 2}}>{r.id}</div>
            </div>
          </div>

          <div className="resumo-aviso">
            Resumo gerado a partir dos dados cadastrados no ResQui. <strong>Não é a FISPQ do produto e
            não a substitui</strong> — a FISPQ é emitida pelo fabricante (ABNT NBR 14725).
          </div>

          <BlocoResumo titulo="Identificação">
            <LinhaResumo label="Nome" value={r.nome}/>
            <LinhaResumo label="Sinônimo" value={r.sinonimo || '—'}/>
            <LinhaResumo label="Fórmula molecular" value={r.formula || '—'}/>
            <LinhaResumo label="CAS" value={r.cas} mono/>
            <LinhaResumo label="Código interno" value={r.id} mono/>
            <LinhaResumo label="Produto controlado" value={r.controlado ? 'Sim' : 'Não'}/>
          </BlocoResumo>

          <BlocoResumo titulo="Perigos (GHS)">
            {semGhs ? (
              <div style={semDado}>Sem classificação GHS cadastrada para este reagente.</div>
            ) : (<>
              {pictos.length > 0 && (
                <div style={{display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap'}}>
                  {pictos.map(p => {
                    const info = PICTOS_GHS[p];
                    return (
                      <div key={p} className="resumo-picto-tile">
                        <span style={{fontFamily: 'Courier, monospace', fontWeight: 700, color: '#c00'}}>{info?.code || p}</span>
                        <span style={{fontSize: 12, color: '#444'}}>{info?.label || p}</span>
                      </div>);
                  })}
                </div>
              )}
              {r.signal && <LinhaResumo label="Palavra de advertência" value={r.signal}/>}
              {frasesH.length > 0 && (<>
                <div style={rotuloLista}>Frases de perigo (H)</div>
                <ul style={listaResumo}>{frasesH.map(h => <li key={h}>{h}</li>)}</ul>
              </>)}
              {frasesP.length > 0 && (<>
                <div style={rotuloLista}>Frases de precaução (P)</div>
                <ul style={listaResumo}>{frasesP.map(p => <li key={p}>{p}</li>)}</ul>
              </>)}
            </>)}
          </BlocoResumo>

          <BlocoResumo titulo="Reatividade e incompatibilidades">
            <LinhaResumo label="Classe de reatividade" value={`${r.classe}. ${REATIVIDADE_CLASSES[r.classe]}`}/>
            {matrizPendente && <div style={semDado}>Carregando a matriz de compatibilidade…</div>}
            {matrizErro && <div style={semDado}>Não foi possível carregar a matriz de compatibilidade.</div>}
            {!matrizPendente && !matrizErro && (<>
              <div style={rotuloLista}>Proibido armazenar junto</div>
              {proibidas.length > 0
                ? <ul style={listaResumo}>{proibidas.map(c => <li key={c}>{c}</li>)}</ul>
                : <div style={semDado}>Nenhuma classe em nível Proibido para esta classe.</div>}
              <div style={rotuloLista}>Perigo — não armazenar próximo</div>
              {perigosas.length > 0
                ? <ul style={listaResumo}>{perigosas.map(c => <li key={c}>{c}</li>)}</ul>
                : <div style={semDado}>Nenhuma classe em nível Perigo para esta classe.</div>}
            </>)}
          </BlocoResumo>

          <BlocoResumo titulo="Armazenamento">
            <LinhaResumo label="Local" value={r.local}/>
            <LinhaResumo label="Estoque atual" value={`${r.estoque} ${r.unidade}`}/>
            {r.estoque_min != null && <LinhaResumo label="Estoque mínimo" value={`${r.estoque_min} ${r.unidade}`}/>}
            <LinhaResumo label="Validade" value={`${r.validade}${r.validade_status ? ` (${VALIDADE_LABEL[r.validade_status] ?? r.validade_status})` : ''}`}/>
            {r.lote && <LinhaResumo label="Lote" value={r.lote} mono/>}
            {r.abertura && <LinhaResumo label="Aberto em" value={r.abertura}/>}
          </BlocoResumo>

          <div style={{marginTop: 22, paddingTop: 12, borderTop: '1px solid #111', fontSize: 12, color: '#444', lineHeight: 1.5}}>
            Emitido em {hoje} a partir do cadastro do ResQui. As incompatibilidades vêm da matriz de
            compatibilidade do sistema; consulte a FISPQ do fabricante para dados de toxicidade,
            primeiros socorros, combate a incêndio e transporte.
          </div>
        </div>
      </div>
    </Modal>
  );
}
