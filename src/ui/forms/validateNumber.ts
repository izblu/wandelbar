import { formatNumber, INPUT_DECIMALS, parseDecimal } from '../format.ts';

export interface NumberRules {
  min?: number;
  max?: number;
  /** Einheit für Meldungen, z. B. „cm“ */
  unit?: string;
  /** Beispielwert in der Meldung „Gib eine Zahl ein, zum Beispiel …“ */
  example?: number;
}

export type NumberCheck = { ok: true; value: number } | { ok: false; message: string };

/**
 * Prüft eine getippte Zahl und formuliert die Meldung so, dass klar ist, was zu tun ist.
 * Die Meldungen erklären den Weg, nicht den Fehler.
 */
export function validateNumber(
  text: string,
  { min, max, unit, example }: NumberRules,
): NumberCheck {
  const value = parseDecimal(text);
  // Ungerundet: Auch Beispiel und Grenzen erscheinen so genau, wie sie sind.
  const format = (n: number) => formatNumber(n, INPUT_DECIMALS);
  const withUnit = (n: number) => (unit ? `${format(n)} ${unit}` : format(n));
  if (value === null) {
    const sample = example ?? min ?? 1;
    return { ok: false, message: `Gib eine Zahl ein, zum Beispiel ${format(sample)}.` };
  }
  if (min !== undefined && value < min) {
    return { ok: false, message: `Gib mindestens ${withUnit(min)} ein.` };
  }
  if (max !== undefined && value > max) {
    return { ok: false, message: `Gib höchstens ${withUnit(max)} ein.` };
  }
  return { ok: true, value };
}
