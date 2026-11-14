/**
 * Kleine Helfer für Bewegung per Web Animations API. Dauern kommen aus den Tokens, damit
 * reduzierte Bewegung (alle Dauern 0 ms) überall gleich wirkt.
 */

/** Liest einen Zahlen-Token in Pixeln, z. B. `--sheet-peek`. */
export function readPixels(element: Element, token: string, fallback: number): number {
  const value = Number.parseFloat(getComputedStyle(element).getPropertyValue(token));
  return Number.isFinite(value) ? value : fallback;
}

/** Liest einen Dauer-Token (`250ms` oder `0.25s`) in Millisekunden. */
export function readDuration(element: Element, token: string): number {
  const raw = getComputedStyle(element).getPropertyValue(token).trim();
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value)) return 0;
  return raw.endsWith('ms') ? value : raw.endsWith('s') ? value * 1000 : value;
}

/** Liest eine Kurve wie `--ease-standard`; ohne Wert gilt `ease-out`. */
export function readEasing(element: Element, token: string): string {
  return getComputedStyle(element).getPropertyValue(token).trim() || 'ease-out';
}
