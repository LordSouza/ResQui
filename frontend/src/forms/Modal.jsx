import { useEffect, useId, useRef, useState } from 'react';
import { Icon } from '../components';
import { urlDoTutorial } from '../lib/tutoriais';

const SELETOR_FOCAVEL = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])', 'select:not([disabled])',
  'textarea:not([disabled])', 'summary', '[tabindex]:not([tabindex="-1"])',
].join(', ');

function estaOculto(elemento) {
  if (elemento.closest('[hidden]')) return true;
  if (elemento.style.display === 'none') return true;
  const detalhesFechado = elemento.closest('details:not([open])');
  return detalhesFechado !== null && elemento !== detalhesFechado.querySelector(':scope > summary');
}

function elementosFocaveis(container) {
  return [...container.querySelectorAll(SELETOR_FOCAVEL)].filter(el => !estaOculto(el));
}

function focarPrimeiroCampo(dialogo) {
  if (dialogo.contains(document.activeElement)) return;
  const corpo = dialogo.querySelector('.modal-body');
  const primeiro = (corpo && elementosFocaveis(corpo)[0]) ?? elementosFocaveis(dialogo)[0];
  (primeiro ?? dialogo).focus();
}

function manterFocoDentro(evento, dialogo) {
  const focaveis = elementosFocaveis(dialogo);
  if (focaveis.length === 0) { evento.preventDefault(); return; }
  const primeiro = focaveis[0];
  const ultimo = focaveis[focaveis.length - 1];
  if (!focaveis.includes(document.activeElement)) {
    evento.preventDefault();
    (evento.shiftKey ? ultimo : primeiro).focus();
    return;
  }
  if (evento.shiftKey && document.activeElement === primeiro) {
    evento.preventDefault();
    ultimo.focus();
  } else if (!evento.shiftKey && document.activeElement === ultimo) {
    evento.preventDefault();
    primeiro.focus();
  }
}

export default function Modal({ title, sub, onClose, children, width = 560, footer, tutorial }) {
  const dialogoRef = useRef(null);
  const alterado = useRef(false);
  const [confirmandoDescarte, setConfirmandoDescarte] = useState(false);
  const tituloId = useId();
  const subtituloId = useId();

  const tentarFechar = () => {
    if (alterado.current) setConfirmandoDescarte(true);
    else onClose();
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (confirmandoDescarte || !alterado.current) onClose();
      else setConfirmandoDescarte(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, confirmandoDescarte]);

  useEffect(() => {
    const focoAnterior = document.activeElement;
    document.body.style.overflow = 'hidden';
    focarPrimeiroCampo(dialogoRef.current);
    return () => {
      document.body.style.overflow = '';
      if (focoAnterior?.isConnected) focoAnterior.focus();
    };
  }, []);

  return (
    <div className="modal-backdrop" role="presentation" onClick={tentarFechar}>
      <div ref={dialogoRef} className="modal" style={{width}} role="dialog" aria-modal="true"
        aria-labelledby={tituloId} aria-describedby={sub ? subtituloId : undefined} tabIndex={-1}
        onClick={e => e.stopPropagation()}
        onChange={() => { alterado.current = true; }}
        onKeyDown={e => { if (e.key === 'Tab') manterFocoDentro(e, dialogoRef.current); }}>
        <div className="modal-h">
          <div>
            <div className="modal-title" id={tituloId}>{title}</div>
            {sub && <div className="modal-sub" id={subtituloId}>{sub}</div>}
          </div>
          <div className="modal-h-acoes">
            {tutorial && (
              <a className="modal-tutorial" href={urlDoTutorial(tutorial)} target="_blank" rel="noopener noreferrer">
                <Icon name="book" size={13}/> Ver tutorial
              </a>
            )}
            <button type="button" className="close" aria-label="Fechar janela" onClick={onClose}><Icon name="close" size={16}/></button>
          </div>
        </div>
        <div className="modal-body">{children}</div>
        {confirmandoDescarte && (
          <ConfirmacaoDescarte
            onContinuar={() => { setConfirmandoDescarte(false); dialogoRef.current.focus(); }}
            onDescartar={onClose} />
        )}
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

function ConfirmacaoDescarte({ onContinuar, onDescartar }) {
  const continuarRef = useRef(null);
  useEffect(() => { continuarRef.current?.focus(); }, []);
  return (
    <div className="modal-descarte" role="alert">
      <span>Fechar agora descarta o que foi preenchido.</span>
      <button ref={continuarRef} type="button" className="btn btn-sm" onClick={onContinuar}>Continuar editando</button>
      <button type="button" className="btn btn-danger btn-sm" onClick={onDescartar}>Descartar</button>
    </div>
  );
}
