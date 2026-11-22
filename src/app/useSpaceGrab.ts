import { useEffect, useState } from 'react';

/** Hier gehört die Leertaste dem Element (Knopf drücken, Text tippen, Regler) */
function ownsSpace(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest(
      'input, textarea, select, button, a[href], summary, [contenteditable="true"], [role="slider"], [role="option"]',
    ) !== null
  );
}

/**
 * Leertaste halten: Ziehen verschiebt vorübergehend die Ansicht, wie die Hand in
 * Grafikprogrammen. Greift nicht, solange ein Knopf, ein Feld oder ein Regler den Fokus hat.
 */
export function useSpaceGrab(): boolean {
  const [held, setHeld] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || event.ctrlKey || event.altKey || event.metaKey) return;
      if (event.defaultPrevented || ownsSpace(event.target)) return;
      if (document.querySelector('dialog[open]:modal')) return;
      // Sonst blättert der Browser die Seite
      event.preventDefault();
      setHeld(true);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') setHeld(false);
    };
    const release = () => {
      setHeld(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', release);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', release);
    };
  }, []);

  return held;
}
