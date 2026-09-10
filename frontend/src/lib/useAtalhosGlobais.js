import { useEffect, useRef } from 'react';

// Atalhos que valem em qualquer lugar do app.
export function useAtalhosGlobais({ onChat } = {}) {
  const handlers = useRef({});
  handlers.current = { onChat };

  useEffect(() => {
    const onKey = (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === '/') { e.preventDefault(); handlers.current.onChat?.(); }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
