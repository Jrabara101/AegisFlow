import { useEffect, useRef } from 'react';

// Single-key shortcuts for presenting: bindings maps a key (as in
// KeyboardEvent.key) to a handler. Ignored while typing or with modifiers.
export function useShortcuts(bindings) {
  const latest = useRef(bindings);
  latest.current = bindings;

  useEffect(() => {
    const onKey = (event) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.target.closest?.('input, textarea, select, [contenteditable]')) return;
      const handler = latest.current[event.key] ?? latest.current[event.key.toLowerCase()];
      if (!handler) return;
      event.preventDefault();
      handler();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
