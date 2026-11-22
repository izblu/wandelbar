import { describe, expect, it } from 'vitest';
import { ariaKeyShortcut, displayHotkey, matchesHotkey, parseHotkey } from './hotkeys.ts';

const press = (
  key: string,
  mods: Partial<Record<'ctrl' | 'meta' | 'shift' | 'alt', boolean>> = {},
) => ({
  key,
  ctrlKey: mods.ctrl ?? false,
  metaKey: mods.meta ?? false,
  shiftKey: mods.shift ?? false,
  altKey: mods.alt ?? false,
});

describe('Tastenkürzel', () => {
  it('erkennt Strg und ⌘ als mod', () => {
    const hotkey = parseHotkey('mod+k');
    expect(matchesHotkey(press('k', { ctrl: true }), hotkey)).toBe(true);
    expect(matchesHotkey(press('K', { meta: true }), hotkey)).toBe(true);
    expect(matchesHotkey(press('k'), hotkey)).toBe(false);
  });

  it('löst einfache Kürzel nicht mit Strg aus', () => {
    expect(matchesHotkey(press('v', { ctrl: true }), parseHotkey('v'))).toBe(false);
    expect(matchesHotkey(press('v'), parseHotkey('v'))).toBe(true);
  });

  it('beschreibt Kürzel für Bildschirmleser und für das Auge', () => {
    expect(ariaKeyShortcut('mod+k')).toBe('Control+K');
    expect(ariaKeyShortcut('v')).toBe('V');
    expect(displayHotkey('mod+z')).toBe('Strg Z');
    expect(displayHotkey('mod+shift+z')).toBe('Strg Umschalt Z');
  });
});
