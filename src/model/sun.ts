/**
 * Vereinfachter Sonnenstand für den Tageszeit-Regler.
 *
 * Wie in den Entwürfen (D-017): ein Sommertag in Mitteldeutschland, Sonnenaufgang 5:30 Uhr,
 * Untergang 21:00 Uhr (MESZ). Die genaue Berechnung nach Datum und Nordrichtung folgt mit dem 3D.
 */

export interface SunPosition {
  /** Himmelsrichtung in Grad, von Norden im Uhrzeigersinn (90 = Osten). */
  azimuth: number;
  /** Höhe über dem Horizont in Grad, negativ nach Sonnenuntergang. */
  elevation: number;
}

const SUNRISE = 5.5;
const SUNSET = 21;
const MAX_ELEVATION = 60;

/** Ab dieser Sonnenhöhe gilt es als Tag; darunter leuchten die Lampen. */
const DAYLIGHT_ELEVATION = 4;

export function sunPosition(hours: number): SunPosition {
  const elevation = MAX_ELEVATION * Math.sin((Math.PI * (hours - SUNRISE)) / (SUNSET - SUNRISE));
  const azimuth = 180 + (hours - (SUNRISE + SUNSET) / 2) * 15;
  return { azimuth, elevation };
}

export type DayPhase = 'day' | 'night';

export function dayPhase(hours: number): DayPhase {
  return sunPosition(hours).elevation > DAYLIGHT_ELEVATION ? 'day' : 'night';
}
