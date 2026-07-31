import { useEffect, useRef } from 'react';

// Atalhos que valem em qualquer lugar do app. Fora do ⌘K, ficam inertes enquanto o foco
// está num campo de texto — senão digitar "?" numa descrição abriria um modal.
function digitando() {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
}

export function useAtalhosGlobais({ onBuscar, onAtalhos, onChat, onEscape } = {}) {
  const handlers = useRef({});
  handlers.current = { onBuscar, onAtalhos, onChat, onEscape };

  useEffect(() => {
    const onKey = (e) => {
      const mod = e.metaKey || e.ctrlKey;
      const h = handlers.current;

      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();          // o Chrome usa ⌘K para a barra de endereços
        h.onBuscar?.();
        return;
      }
      if (digitando()) return;

      if (mod && e.key === '/') { e.preventDefault(); h.onChat?.(); return; }
      if (e.key === '?')        { e.preventDefault(); h.onAtalhos?.(); return; }
      if (e.key === 'Escape')   { h.onEscape?.(); }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
