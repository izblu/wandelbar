/**
 * Richtungen in Worten: auf dem Bildschirm (für die Nordrichtung des Plans) und als
 * Himmelsrichtung (für Fenster).
 */

const SCREEN = [
  'oben',
  'oben rechts',
  'rechts',
  'unten rechts',
  'unten',
  'unten links',
  'links',
  'oben links',
];
const COMPASS = [
  'Norden',
  'Nordosten',
  'Osten',
  'Südosten',
  'Süden',
  'Südwesten',
  'Westen',
  'Nordwesten',
];

function octant(degrees: number): number {
  return Math.round((((degrees % 360) + 360) % 360) / 45) % 8;
}

/** Wohin ein Winkel (im Uhrzeigersinn von oben) auf dem Bildschirm zeigt */
export function screenDirection(degrees: number): string {
  return SCREEN[octant(degrees)] ?? 'oben';
}

/** Himmelsrichtung eines Winkels (im Uhrzeigersinn von Norden) */
export function compassPoint(degrees: number): string {
  return COMPASS[octant(degrees)] ?? 'Norden';
}

/** Wann die Sonne durch ein Fenster mit dieser Himmelsrichtung scheint */
export function sunHours(degrees: number): string {
  const name = compassPoint(degrees);
  const hints: Record<string, string> = {
    Norden: 'kaum direkte Sonne',
    Nordosten: 'früh am Morgen',
    Osten: 'morgens',
    Südosten: 'vormittags',
    Süden: 'mittags',
    Südwesten: 'nachmittags',
    Westen: 'nachmittags und abends',
    Nordwesten: 'am Abend',
  };
  return hints[name] ?? '';
}
