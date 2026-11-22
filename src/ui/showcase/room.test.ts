import { describe, expect, it } from 'vitest';
import { eveningAmount, footprint, INITIAL_FURNITURE, sunPatches } from './room.ts';

describe('sunPatches', () => {
  it('lässt morgens die Sonne durch das Ostfenster herein', () => {
    const patches = sunPatches(7.5);
    expect(patches).toHaveLength(1);
    // Der Fleck liegt im Raum, also westlich der Ostwand
    for (const [x] of patches[0] ?? []) expect(x).toBeLessThan(6);
  });

  it('scheint mittags nur durch das Südfenster', () => {
    const patches = sunPatches(13.25);
    expect(patches).toHaveLength(1);
    for (const [, y] of patches[0] ?? []) expect(y).toBeLessThan(4.4);
  });

  it('kennt nach Sonnenuntergang keine Flecken', () => {
    expect(sunPatches(21.5)).toEqual([]);
  });
});

describe('eveningAmount', () => {
  it('ist mittags 0 und nachts 1', () => {
    expect(eveningAmount(13)).toBe(0);
    expect(eveningAmount(22)).toBe(1);
  });
});

describe('footprint', () => {
  it('tauscht Breite und Tiefe bei einer Vierteldrehung', () => {
    const chair = INITIAL_FURNITURE.find((item) => item.id === 'sofa');
    if (!chair) throw new Error('Sofa fehlt');
    const turned = footprint({ ...chair, rotation: 90 });
    expect(turned.x1 - turned.x0).toBeCloseTo(chair.d);
    expect(turned.y1 - turned.y0).toBeCloseTo(chair.w);
  });
});
