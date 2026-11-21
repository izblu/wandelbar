import { describe, expect, it } from 'vitest';
import { parseHit } from './hits.ts';

describe('parseHit', () => {
  it('macht aus `art:id` eine Auswahl', () => {
    expect(parseHit('furniture:sofa')).toEqual({ kind: 'furniture', id: 'sofa' });
    expect(parseHit('wall:w-north')).toEqual({ kind: 'wall', id: 'w-north' });
    expect(parseHit('opening:f-living-west')).toEqual({ kind: 'opening', id: 'f-living-west' });
    expect(parseHit('room:living')).toEqual({ kind: 'room', id: 'living' });
  });

  it('wählt nichts, wenn nichts getroffen ist', () => {
    expect(parseHit(null)).toBeNull();
    expect(parseHit('')).toBeNull();
  });

  it('übergeht unbekannte Arten und fehlende Kennungen', () => {
    expect(parseHit('lamp:floor-lamp')).toBeNull();
    expect(parseHit('wall:')).toBeNull();
    expect(parseHit('wall')).toBeNull();
    expect(parseHit(':sofa')).toBeNull();
  });
});
