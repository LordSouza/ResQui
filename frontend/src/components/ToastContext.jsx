import { createContext, useContext, useState, useCallback, useRef } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    clearTimeout(timers.current[id]);
    delete timers.current[id];
  }, []);

  const addToast = useCallback((message, kind = 'error') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(prev => {
      const next = [...prev, { id, message, kind }];
      if (next.length > 5) {
        const evicted = next[0];
        clearTimeout(timers.current[evicted.id]);
        delete timers.current[evicted.id];
        return next.slice(1);
      }
      return next;
    });
    timers.current[id] = setTimeout(() => removeToast(id), 5000);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast, toasts }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
