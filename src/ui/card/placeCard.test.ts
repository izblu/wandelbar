import { describe, expect, it } from 'vitest';
import { placeCard, TAIL_INSET, type CardPlacementInput } from './placeCard.ts';

const base: CardPlacementInput = {
  target: { x0: 400, y0: 300, x1: 600, y1: 400, anchorX: 500, anchorY: 300 },
  card: { width: 304, height: 420 },
  stage: { width: 1440, height: 900 },
  gap: 40,
  margin: 24,
  safeTop: 92,
  safeBottom: 92,
};

describe('placeCard', () => {
  it('steht bevorzugt rechts neben dem Objekt', () => {
    const placement = placeCard(base);
    expect(placement.side).toBe('right');
    expect(placement.left).toBe(640);
  });

  it('kippt nach links, wenn rechts kein Platz ist', () => {
    const placement = placeCard({
      ...base,
      target: { ...base.target, x0: 1000, x1: 1200, anchorX: 1100 },
    });
    expect(placement.side).toBe('left');
    expect(placement.left).toBe(1000 - 40 - 304);
  });

  it('kippt nach rechts, wenn links bevorzugt, aber kein Platz ist', () => {
    const placement = placeCard({
      ...base,
      prefer: 'left',
      target: { ...base.target, x0: 100, x1: 200, anchorX: 150 },
    });
    expect(placement.side).toBe('right');
    expect(placement.left).toBe(240);
  });

  it('klemmt an die Ränder der Bühne, wenn beide Seiten zu eng sind', () => {
    const placement = placeCard({
      ...base,
      stage: { width: 700, height: 900 },
      target: { x0: 150, y0: 300, x1: 550, y1: 400, anchorX: 350, anchorY: 300 },
    });
    expect(placement.left).toBeGreaterThanOrEqual(24);
    expect(placement.left + 304).toBeLessThanOrEqual(700 - 24);
  });

  it('hält oben und unten Abstand zu den Leisten', () => {
    const high = placeCard({
      ...base,
      target: { ...base.target, y0: 0, y1: 40, anchorY: 0 },
    });
    expect(high.top).toBe(92);
    const low = placeCard({
      ...base,
      target: { ...base.target, y0: 860, y1: 900, anchorY: 860 },
    });
    expect(low.top).toBe(900 - 420 - 92);
  });

  it('lässt die Spitze auf den Anker zeigen, aber nie in die Ecken', () => {
    const placement = placeCard(base);
    expect(placement.tailY).toBe(300 - placement.top);
    const corner = placeCard({
      ...base,
      target: { ...base.target, y0: 0, y1: 40, anchorY: 0 },
    });
    expect(corner.tailY).toBe(TAIL_INSET);
  });

  it('rutscht bei sehr breiten Objekten nicht unter die Werkzeugpalette', () => {
    const wide = {
      ...base,
      target: { x0: 200, y0: 300, x1: 1300, y1: 400, anchorX: 750, anchorY: 300 },
    };
    expect(placeCard(wide).left).toBe(24);
    const placement = placeCard({ ...wide, safeLeft: 96 });
    expect(placement.side).toBe('left');
    expect(placement.left).toBe(96);
  });

  it('kippt nach rechts, wenn links nur der Freiraum der Palette bliebe', () => {
    const placement = placeCard({
      ...base,
      prefer: 'left',
      safeLeft: 96,
      target: { ...base.target, x0: 420, x1: 500, anchorX: 460 },
    });
    expect(placement.side).toBe('right');
    expect(placement.left).toBe(540);
  });
});
