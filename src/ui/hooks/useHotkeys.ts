import { useEffect, useRef } from 'react';
import { matchesHotkey, parseHotkey } from '../hotkeys.ts';

/**
 * Gibt ein Handler `false` zurück, war nichts zu tun (z. B. Pfeiltaste ohne gewähltes Möbel):
 * Dann bleibt die Taste dem Element mit dem Fokus und dem Browser. Jeder andere Rückgabewert,
 * auch keiner, gilt als erledigt. (`unknown`, damit Handler ohne Rückgabe weiter passen.)
 */
export type HotkeyHandler = (event: KeyboardEvent) => unknown;
export type HotkeyMap = Record<string, HotkeyHandler>;

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

/** Tasten, mit denen sich Regler und Radios selbst bedienen */
const ELEMENT_KEYS = new Set([
  'arrowleft',
  'arrowright',
  'arrowup',
  'arrowdown',
  'home',
  'end',
  'pageup',
  'pagedown',
]);

/** Regler und Radiogruppen (z. B. Farbfelder) brauchen diese Taste selbst */
function ownsKey(target: EventTarget | null, key: string): boolean {
  return (
    ELEMENT_KEYS.has(key) &&
    target instanceof HTMLElement &&
    target.closest('input[type="range"], input[type="radio"]') !== null
  );
}

/**
 * Meldet Tastenkürzel am Dokument an. Beim Tippen in einem Feld greifen sie nur mit
 * `allowInFields` (sonst gehört z. B. Strg+Z dem Feld). Pfeiltasten gehören Reglern und Radios.
 * Kürzel ohne Strg greifen nicht, solange ein modaler Dialog oder ein Menü (Popover) offen ist;
 * so schließt Esc das Menü.
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
        if (!hotkey.mod && ownsKey(event.target, hotkey.key)) return;
        if (!hotkey.mod && document.querySelector('dialog[open]:modal, :popover-open')) return;
        if (handler(event) !== false) event.preventDefault();
        return;
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [allowInFields, enabled]);
}
