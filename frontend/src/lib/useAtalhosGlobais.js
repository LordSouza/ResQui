import { useEffect, useRef } from 'react';

// Atalhos que valem em qualquer lugar do app. Fora do ⌘K, ficam inertes enquanto o foco
// está num campo de texto — senão digitar "?" numa descrição abriria um modal.
function digitando() {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
}

export function useAtalhosGlobais({ onBuscar, onAtalhos, onChat } = {}) {
  const handlers = useRef({});
  handlers.current = { onBuscar, onAtalhos, onChat };

  useEffect(() => {
    const onKey = (e) => {
      const mod = e.metaKey || e.ctrlKey;
      const h = handlers.current;

      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();          // o Chrome usa ⌘K para a barra de endereços
        h.onBuscar?.();
        return;
      }
      // combinação com modificador: libera do gate de "digitando" como o ⌘K acima —
      // é justamente de dentro de um campo de texto (o textarea do chat) que se quer
      // fechar o chat, então bloquear aqui tornaria a metade "fechar" do atalho inalcançável
      if (mod && e.key === '/') { e.preventDefault(); h.onChat?.(); return; }
      if (digitando()) return;

      if (e.key === '?') { e.preventDefault(); h.onAtalhos?.(); }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
