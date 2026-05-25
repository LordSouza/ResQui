import { useEffect } from 'react';
import { Icon } from '../components';

export default function Modal({ title, sub, onClose, children, width = 560, footer }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onClose(); }}>
      <div className="modal" style={{width}} onClick={e => e.stopPropagation()}>
        <div className="modal-h">
          <div>
            <div className="modal-title">{title}</div>
            {sub && <div className="modal-sub">{sub}</div>}
          </div>
          <button type="button" className="close" onClick={onClose}><Icon name="close" size={16}/></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}
