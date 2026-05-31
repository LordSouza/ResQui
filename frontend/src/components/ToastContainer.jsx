import { useToast } from './ToastContext';
import { Icon } from './index';

export function ToastContainer() {
  const { toasts, removeToast } = useToast();
  if (!toasts.length) return null;

  return (
    <div className="toast-container" role="region" aria-live="polite" aria-label="Notificações">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast--${t.kind}`} role="alert">
          <Icon name="warning" size={16} />
          <span className="toast-message">{t.message}</span>
          <button className="toast-close" onClick={() => removeToast(t.id)} aria-label="Fechar">×</button>
        </div>
      ))}
    </div>
  );
}
