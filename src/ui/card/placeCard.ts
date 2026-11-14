/**
 * Platzierung der Eigenschaftenkarte am PC, als reine Funktion (aus den Entwürfen, MD).
 *
 * Die Karte steht neben dem gewählten Objekt, bevorzugt rechts. Passt sie dort nicht hin, kippt sie
 * nach links. Danach wird sie an die Ränder der Bühne geklemmt, oben und unten mit Abstand zu den
 * Leisten. Die Spitze zeigt auf den Ankerpunkt des Objekts, bleibt aber innerhalb der Karte.
 */

export type CardSide = 'left' | 'right';

/** Lage des Objekts auf der Bühne in Pixeln, mit Ankerpunkt (z. B. Mitte der Oberseite). */
export interface CardTarget {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  anchorX: number;
  anchorY: number;
}

export interface CardPlacementInput {
  target: CardTarget;
  card: { width: number; height: number };
  stage: { width: number; height: number };
  /** Abstand zwischen Objekt und Karte */
  gap: number;
  /** Mindestabstand zu den Rändern der Bühne */
  margin: number;
  /** Freiraum oben (Kopfzeile) und unten (Ansichtsleiste) */
  safeTop: number;
  safeBottom: number;
  prefer?: CardSide;
}

export interface CardPlacement {
  left: number;
  top: number;
  side: CardSide;
  /** Höhe der Spitze, gemessen von der Oberkante der Karte */
  tailY: number;
}

/** So weit bleibt die Spitze mindestens von den Ecken der Karte weg (Radius plus Luft). */
export const TAIL_INSET = 28;

/** Anteil der Kartenhöhe über der Objektmitte: Die Karte sitzt leicht oberhalb, wie ein Etikett. */
const CARD_LIFT = 0.38;

export function placeCard({
  target,
  card,
  stage,
  gap,
  margin,
  safeTop,
  safeBottom,
  prefer = 'right',
}: CardPlacementInput): CardPlacement {
  const rightOf = target.x1 + gap;
  const leftOf = target.x0 - gap - card.width;

  let side: CardSide = prefer;
  let left = side === 'right' ? rightOf : leftOf;
  if (side === 'right' && left + card.width > stage.width - margin) {
    side = 'left';
    left = leftOf;
  } else if (side === 'left' && left < margin) {
    side = 'right';
    left = rightOf;
  }
  left = clamp(left, margin, stage.width - card.width - margin);

  const centerY = (target.y0 + target.y1) / 2;
  const top = clamp(
    centerY - card.height * CARD_LIFT,
    safeTop,
    stage.height - card.height - safeBottom,
  );
  const tailY = clamp(target.anchorY - top, TAIL_INSET, card.height - TAIL_INSET);

  return { left: Math.round(left), top: Math.round(top), side, tailY: Math.round(tailY) };
}

/**
 * Klemmt einen Wert zwischen zwei Grenzen. Ist der Platz zu knapp (max < min), gewinnt die
 * untere Grenze: Die Karte bleibt dann lieber oben bzw. links sichtbar.
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}
