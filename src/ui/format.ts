/**
 * Anzeige- und Eingabeformate der Oberfläche: deutsch und metrisch.
 */

const LOCALE = 'de-DE';

/** Uhrzeit aus Stunden als Kommazahl, z. B. 7.5 → „7:30“. */
export function formatClock(hours: number): string {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h)}:${String(m).padStart(2, '0')}`;
}

/**
 * Nachkommastellen für eingegebene Werte: so viele, dass nichts Getipptes gerundet wird, aber
 * Rauschen aus der Gleitkommarechnung (228,25000000000003) nicht zu sehen ist.
 */
export const INPUT_DECIMALS = 6;

/** Zahl mit deutschem Komma und höchstens `maxDecimals` Nachkommastellen. */
export function formatNumber(value: number, maxDecimals = 1): string {
  return new Intl.NumberFormat(LOCALE, {
    maximumFractionDigits: maxDecimals,
    useGrouping: true,
  }).format(value);
}

/** Preis in Euro ohne Cent, z. B. 1290 → „1.290 €“. */
export function formatPrice(euros: number): string {
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(euros);
}

/**
 * Liest eine Zahl, wie Menschen sie tippen: „2,5“, „2.5“, „1.234,5“ oder „ 228 “.
 * Gibt `null` zurück, wenn der Text keine Zahl ist.
 */
export function parseDecimal(text: string): number | null {
  const compact = text.trim().replace(/\s+/g, '');
  if (compact === '') return null;
  if (!/^-?[\d.,]+$/.test(compact)) return null;

  const lastComma = compact.lastIndexOf(',');
  const lastDot = compact.lastIndexOf('.');
  let normalized: string;
  if (lastComma >= 0 && lastDot >= 0) {
    // Beide kommen vor: Das letzte Zeichen trennt die Nachkommastellen.
    const decimalSeparator = lastComma > lastDot ? ',' : '.';
    const groupSeparator = decimalSeparator === ',' ? '.' : ',';
    normalized = compact.split(groupSeparator).join('').replace(decimalSeparator, '.');
  } else if (lastComma >= 0) {
    normalized = compact.replace(',', '.');
  } else if (lastDot >= 0 && /^-?\d{1,3}(\.\d{3})+$/.test(compact)) {
    // „1.234“ ist im Deutschen eine Tausendergruppe, keine Kommazahl.
    normalized = compact.split('.').join('');
  } else {
    normalized = compact;
  }

  if ((normalized.match(/\./g) ?? []).length > 1) return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}
