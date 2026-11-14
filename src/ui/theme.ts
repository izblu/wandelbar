import { storageKey } from '../persistence/storageKey.ts';

/**
 * Hell und dunkel: folgt dem System, lässt sich aber festlegen.
 *
 * Die Wahl liegt in localStorage (Schlüssel mit Basis-Pfad) und wirkt über `data-theme` auf <html>.
 * Die Farben selbst wechseln per `light-dark()` in tokens.css, ganz ohne JavaScript.
 */

export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

const KEY = storageKey('theme');
const listeners = new Set<() => void>();
const darkQuery = (): MediaQueryList => window.matchMedia('(prefers-color-scheme: dark)');

function readPreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  } catch {
    return 'system';
  }
}

let preference: ThemePreference = readPreference();

function apply(): void {
  const root = document.documentElement;
  if (preference === 'system') delete root.dataset.theme;
  else root.dataset.theme = preference;
}

export function getThemePreference(): ThemePreference {
  return preference;
}

export function resolveTheme(): ResolvedTheme {
  if (preference !== 'system') return preference;
  return darkQuery().matches ? 'dark' : 'light';
}

export function setThemePreference(next: ThemePreference): void {
  preference = next;
  try {
    if (next === 'system') window.localStorage.removeItem(KEY);
    else window.localStorage.setItem(KEY, next);
  } catch {
    // Ohne Speicher (z. B. privater Modus) gilt die Wahl nur bis zum Neuladen.
  }
  apply();
  for (const listener of listeners) listener();
}

export function subscribeTheme(listener: () => void): () => void {
  listeners.add(listener);
  const query = darkQuery();
  query.addEventListener('change', listener);
  return () => {
    listeners.delete(listener);
    query.removeEventListener('change', listener);
  };
}

/** Beim Start einmal aufrufen, damit eine gespeicherte Wahl sofort gilt. */
export function initTheme(): void {
  apply();
}
