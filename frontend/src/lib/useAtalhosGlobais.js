import { useEffect, useRef } from 'react';

// Atalhos que valem em qualquer lugar do app.
export function useAtalhosGlobais({ onBuscar, onChat } = {}) {
  const handlers = useRef({});
  handlers.current = { onBuscar, onChat };

  useEffect(() => {
    const onKey = (e) => {
      const mod = e.metaKey || e.ctrlKey;
      const h = handlers.current;

      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();          // o Chrome usa ⌘K para a barra de endereços
        h.onBuscar?.();
        return;
      }
      if (mod && e.key === '/') { e.preventDefault(); h.onChat?.(); }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
