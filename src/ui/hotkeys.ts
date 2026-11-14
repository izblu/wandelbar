/**
 * Tastenkürzel in der Schreibweise „mod+k“, „mod+shift+z“ oder „v“.
 * `mod` ist Strg unter Windows und Android, ⌘ auf dem Mac.
 */

export interface Hotkey {
  key: string;
  mod: boolean;
  shift: boolean;
  alt: boolean;
}

export function parseHotkey(combo: string): Hotkey {
  const parts = combo.toLowerCase().split('+');
  const key = parts.pop() ?? '';
  return {
    key,
    mod: parts.includes('mod'),
    shift: parts.includes('shift'),
    alt: parts.includes('alt'),
  };
}

interface KeyLike {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

export function matchesHotkey(event: KeyLike, hotkey: Hotkey): boolean {
  const mod = event.ctrlKey || event.metaKey;
  return (
    event.key.toLowerCase() === hotkey.key &&
    mod === hotkey.mod &&
    event.shiftKey === hotkey.shift &&
    event.altKey === hotkey.alt
  );
}

/** Wert für `aria-keyshortcuts`, z. B. „mod+k“ → „Control+K“. */
export function ariaKeyShortcut(combo: string): string {
  const hotkey = parseHotkey(combo);
  const parts: string[] = [];
  if (hotkey.mod) parts.push('Control');
  if (hotkey.alt) parts.push('Alt');
  if (hotkey.shift) parts.push('Shift');
  parts.push(hotkey.key.length === 1 ? hotkey.key.toUpperCase() : hotkey.key);
  return parts.join('+');
}

/** Anzeige für Menschen, z. B. „mod+z“ → „Strg Z“. */
export function displayHotkey(combo: string): string {
  const hotkey = parseHotkey(combo);
  const parts: string[] = [];
  if (hotkey.mod) parts.push('Strg');
  if (hotkey.alt) parts.push('Alt');
  if (hotkey.shift) parts.push('Umschalt');
  parts.push(hotkey.key.toUpperCase());
  return parts.join(' ');
}
