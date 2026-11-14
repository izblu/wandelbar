import { useEffect, useRef } from 'react';
import { matchesHotkey, parseHotkey } from '../hotkeys.ts';

export type HotkeyMap = Record<string, (event: KeyboardEvent) => void>;

interface Options {
  /** Auch auslösen, während in einem Eingabefeld getippt wird (z. B. Strg+K). */
  allowInFields?: boolean;
  enabled?: boolean;
}

function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    target.closest(
      'input:not([type="range"], [type="checkbox"], [type="radio"]), textarea, select, [contenteditable="true"]',
    ) !== null
  );
}

/**
 * Meldet Tastenkürzel am Dokument an. Beim Tippen in einem Feld greifen sie nur mit
 * `allowInFields` (sonst gehört z. B. Strg+Z dem Feld). Kürzel ohne Strg greifen nicht,
 * solange ein modaler Dialog offen ist.
 */
export function useHotkeys(
  map: HotkeyMap,
  { allowInFields = false, enabled = true }: Options = {},
): void {
  const mapRef = useRef(map);
  useEffect(() => {
    mapRef.current = map;
  });

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return;
      for (const [combo, handler] of Object.entries(mapRef.current)) {
        const hotkey = parseHotkey(combo);
        if (!matchesHotkey(event, hotkey)) continue;
        if (!allowInFields && isTyping(event.target)) return;
        if (!hotkey.mod && document.querySelector('dialog[open]:modal')) return;
        event.preventDefault();
        handler(event);
        return;
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [allowInFields, enabled]);
}
