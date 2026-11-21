import { formatNumber } from '../ui/format.ts';

/**
 * Meter in Zentimeter, ungerundet. Nur das Rauschen der Gleitkommarechnung fällt weg
 * (0,12 · 100 = 12,000000000000002), damit Felder genau den getippten Wert zurückbekommen.
 */
export function toCentimeters(meters: number): number {
  return Math.round(meters * 1e8) / 1e6;
}

export function toMeters(centimeters: number): number {
  return centimeters / 100;
}

/** Länge für Menschen: „2,94 m“ */
export function formatMeters(meters: number): string {
  return `${formatNumber(meters, 2)} m`;
}

/** Fläche für Menschen: „22,6 m²“ */
export function formatArea(squareMeters: number): string {
  return `${formatNumber(squareMeters, 1)} m²`;
}

/** Weibliche Raumnamen, grob nach der Endung; für Raumnamen reicht das */
const FEMININE_ROOM = /(e|ei|ung|ion|kammer)$/i;

/** „zum Bad“, „zur Küche“ */
export function toRoom(name: string): string {
  return FEMININE_ROOM.test(name) ? `zur ${name}` : `zum ${name}`;
}

/** „im Bad“, „in der Küche“ */
export function inRoom(name: string): string {
  return FEMININE_ROOM.test(name) ? `in der ${name}` : `im ${name}`;
}
