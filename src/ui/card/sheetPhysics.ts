/**
 * Bewegung der Handy-Karte: wohin sie nach dem Loslassen springt und wie sie dorthin federt.
 *
 * Versatz 0 heißt ganz offen, `travel` heißt eingeklappt (nur der Kopf schaut heraus).
 * Geschwindigkeit in Pixeln pro Millisekunde, positiv nach unten.
 */

export type SheetState = 'open' | 'peek';

/** Ab dieser Geschwindigkeit entscheidet die Wischrichtung, nicht die Position. */
const FLICK_VELOCITY = 0.45;
/** So weit (ms) wird eine langsame Bewegung in die Zukunft verlängert. */
const PROJECTION_MS = 160;

export function resolveSheetTarget(offset: number, velocity: number, travel: number): SheetState {
  if (travel <= 0) return 'open';
  if (velocity > FLICK_VELOCITY) return 'peek';
  if (velocity < -FLICK_VELOCITY) return 'open';
  const projected = offset + velocity * PROJECTION_MS;
  return projected < travel / 2 ? 'open' : 'peek';
}

export interface SpringOptions {
  /** Federhärte: höher = schneller */
  stiffness?: number;
  /** Dämpfung: niedriger = mehr Nachschwingen */
  damping?: number;
  mass?: number;
}

export interface SpringAnimation {
  /** Positionen in Pixeln, eine pro Bild (60 je Sekunde), letzte genau am Ziel */
  frames: number[];
  durationMs: number;
}

const FRAME_MS = 1000 / 60;
const MAX_FRAMES = 120;

/**
 * Rechnet eine gedämpfte Feder von `from` nach `to` Bild für Bild aus, startend mit der
 * Wischgeschwindigkeit. Das Ergebnis lässt sich als lineare Keyframes per WAAPI abspielen.
 * Leicht unterdämpft: Die Karte schwingt kaum merklich nach, wie ein echtes Blatt.
 */
export function springFrames(
  from: number,
  to: number,
  velocity = 0,
  { stiffness = 380, damping = 34, mass = 1 }: SpringOptions = {},
): SpringAnimation {
  const dt = FRAME_MS / 1000;
  let position = from;
  let speed = velocity * 1000; // px/s
  const frames = [from];
  for (let i = 0; i < MAX_FRAMES; i += 1) {
    const force = -stiffness * (position - to) - damping * speed;
    speed += (force / mass) * dt;
    position += speed * dt;
    frames.push(position);
    if (Math.abs(position - to) < 0.5 && Math.abs(speed) < 20) break;
  }
  frames[frames.length - 1] = to;
  return { frames, durationMs: Math.round((frames.length - 1) * FRAME_MS) };
}
