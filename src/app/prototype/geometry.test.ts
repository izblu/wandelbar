import { describe, expect, it } from 'vitest';
import { sampleApartment, type Apartment, type Opening, type Point } from './apartment.ts';
import {
  apartmentBounds,
  eveningAmount,
  exteriorWindows,
  openingQuad,
  polygonArea,
  rescaleApartment,
  roomAt,
  SUN_MIN_ELEVATION,
  SUN_THROUGH,
  sunDirection,
  sunPatches,
  totalArea,
  wallFrame,
  wallPieces,
} from './geometry.ts';

const dot = (p: Point, q: Point) => p[0] * q[0] + p[1] * q[1];

function wall(apartment: Apartment, id: string) {
  const found = apartment.walls.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`Wand ${id} fehlt`);
  return found;
}

function window(id: string, wallId: string, roomId: string, offset = 0.5): Opening {
  return {
    id,
    wallId,
    kind: 'window',
    offset,
    width: 1,
    height: 1.4,
    sill: 0.9,
    roomId,
    confidence: 1,
  };
}

describe('Flächen', () => {
  it('rechnet die Fläche eines Vielecks, egal in welcher Umlaufrichtung', () => {
    const rectangle: Point[] = [
      [0, 0],
      [4, 0],
      [4, 3.5],
      [0, 3.5],
    ];
    expect(polygonArea(rectangle)).toBeCloseTo(14, 9);
    expect(polygonArea([...rectangle].reverse())).toBeCloseTo(14, 9);
  });

  it('rechnet L-förmige Räume richtig', () => {
    const living = sampleApartment().rooms.find((room) => room.id === 'living');
    // 5,88 × 4,58 abzüglich der Ecke des Flurs 3,10 × 1,40
    expect(polygonArea(living?.polygon ?? [])).toBeCloseTo(5.88 * 4.58 - 3.1 * 1.4, 9);
  });

  it('ergibt für die Beispielwohnung 81,7 m² Wohnfläche', () => {
    expect(totalArea(sampleApartment().rooms)).toBeCloseTo(81.74, 2);
  });

  it('findet den Raum unter einem Punkt, auch in der Ecke eines L', () => {
    const { rooms } = sampleApartment();
    expect(roomAt(rooms, [1, 7])?.id).toBe('living');
    expect(roomAt(rooms, [4, 4])?.id).toBe('hall');
    expect(roomAt(rooms, [9, 3])?.id).toBe('hall');
    // In der Wand zwischen Schlaf- und Arbeitszimmer liegt kein Raum
    expect(roomAt(rooms, [4.06, 1])).toBeNull();
  });

  it('streckt beim Nachmessen alle Flächen mit dem Quadrat des Faktors', () => {
    const sample = sampleApartment();
    const scaled = rescaleApartment(sample, 1.1);
    expect(totalArea(scaled.rooms)).toBeCloseTo(totalArea(sample.rooms) * 1.21, 9);
    expect(rescaleApartment(sample, 1)).toBe(sample);
  });

  it('behält beim Nachmessen die Möbel an ihrer Stelle im Raum', () => {
    const sample = sampleApartment();
    const scaled = rescaleApartment(sample, 1.2);
    sample.furniture.forEach((item, index) => {
      const moved = scaled.furniture[index];
      if (!moved) throw new Error('Möbel fehlt');
      // Die Mitte wandert mit dem Faktor, die Größe bleibt
      expect(moved.x + moved.w / 2).toBeCloseTo((item.x + item.w / 2) * 1.2, 9);
      expect(moved.y + moved.d / 2).toBeCloseTo((item.y + item.d / 2) * 1.2, 9);
      expect(moved.w).toBe(item.w);
    });
  });

  it('kennt die äußeren Grenzen des Baus samt Außenwänden', () => {
    const bounds = apartmentBounds(sampleApartment());
    expect(bounds.x0).toBeCloseTo(-0.3, 9);
    expect(bounds.y0).toBeCloseTo(-0.3, 9);
    expect(bounds.x1).toBeCloseTo(10.7, 9);
    expect(bounds.y1).toBeCloseTo(8.5, 9);
    expect(apartmentBounds({ walls: [] })).toEqual({ x0: 0, y0: 0, x1: 1, y1: 1 });
  });
});

describe('Wandstücke und Öffnungen', () => {
  it('lässt eine Wand ohne Öffnung ganz und um die halbe Dicke über die Enden ragen', () => {
    const sample = sampleApartment();
    const inner = wall(sample, 'w-sleep-work');
    const { length } = wallFrame(inner);
    expect(wallPieces(inner, sample.openings)).toEqual([
      {
        t0: -inner.thickness / 2,
        t1: length + inner.thickness / 2,
        openStart: false,
        openEnd: false,
      },
    ]);
  });

  it('teilt eine Wand an ihren Öffnungen, in der Reihenfolge entlang der Wand', () => {
    const sample = sampleApartment();
    const north = wall(sample, 'w-north');
    const own = sample.openings
      .filter((opening) => opening.wallId === north.id)
      .sort((a, b) => a.offset - b.offset);
    // Öffnungen in verdrehter Reihenfolge übergeben: Das Ergebnis muss gleich bleiben
    const pieces = wallPieces(north, [...sample.openings].reverse());
    expect(pieces).toHaveLength(own.length + 1);
    own.forEach((opening, index) => {
      expect(pieces[index]?.t1).toBeCloseTo(opening.offset, 9);
      expect(pieces[index + 1]?.t0).toBeCloseTo(opening.offset + opening.width, 9);
    });
    // Nur an Öffnungen offen: keine Stirnfläche im Puppenhaus
    expect(pieces.map((piece) => [piece.openStart, piece.openEnd])).toEqual([
      [false, true],
      [true, true],
      [true, true],
      [true, false],
    ]);
  });

  it('verliert keine Länge: Stücke und Öffnungen ergeben die ganze Wand', () => {
    const sample = sampleApartment();
    for (const candidate of sample.walls) {
      const pieces = wallPieces(candidate, sample.openings);
      const solid = pieces.reduce((sum, piece) => sum + piece.t1 - piece.t0, 0);
      const open = sample.openings
        .filter((opening) => opening.wallId === candidate.id)
        .reduce((sum, opening) => sum + opening.width, 0);
      expect(solid + open).toBeCloseTo(wallFrame(candidate).length + candidate.thickness, 9);
    }
  });

  it('legt sich überlappende Öffnungen zu einer Lücke zusammen', () => {
    const sample = sampleApartment();
    const inner = wall(sample, 'w-sleep-work');
    const pieces = wallPieces(inner, [
      window('a', inner.id, 'sleep', 0.5),
      window('b', inner.id, 'sleep', 1.2),
    ]);
    expect(pieces).toHaveLength(2);
    expect(pieces[0]?.t1).toBeCloseTo(0.5, 9);
    expect(pieces[1]?.t0).toBeCloseTo(2.2, 9);
  });

  it('zeichnet eine Öffnung als Rechteck über die ganze Wanddicke', () => {
    const sample = sampleApartment();
    const north = wall(sample, 'w-north');
    const opening = sample.openings.find((candidate) => candidate.id === 'f-sleep');
    if (!opening) throw new Error('Fenster fehlt');
    const quad = openingQuad(north, opening);
    const xs = quad.map((p) => p[0]);
    const ys = quad.map((p) => p[1]);
    // Die Wand beginnt bei x = −0,15
    expect(Math.min(...xs)).toBeCloseTo(-0.15 + 1.35, 9);
    expect(Math.max(...xs)).toBeCloseTo(-0.15 + 1.35 + 1.6, 9);
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(north.thickness, 9);
  });
});

describe('exteriorWindows', () => {
  it('nimmt nur Fenster in Außenwänden, keine Türen und keine Fenster in Innenwänden', () => {
    const sample = sampleApartment();
    const apartment = {
      ...sample,
      openings: [...sample.openings, window('f-inner', 'w-sleep-work', 'work')],
    };
    const ids = exteriorWindows(apartment).map((aperture) => aperture.opening.id);
    expect(ids).not.toContain('f-inner');
    expect(ids).not.toContain('d-entrance');
    expect(ids.sort()).toEqual(
      sample.openings
        .filter((opening) => opening.kind === 'window')
        .map((opening) => opening.id)
        .sort(),
    );
  });

  it('beschreibt die Öffnung an der Innenseite der Wand und zeigt nach außen', () => {
    const sample = sampleApartment();
    const apertures = exteriorWindows(sample);
    const sleep = apertures.find((aperture) => aperture.opening.id === 'f-sleep');
    expect(sleep?.outward[0]).toBeCloseTo(0, 9);
    expect(sleep?.outward[1]).toBeCloseTo(-1, 9);
    // Die Innenseite der Nordwand liegt bei y = 0, am Boden des Schlafzimmers
    expect(sleep?.p0[1]).toBeCloseTo(0, 9);
    expect(sleep?.p1[1]).toBeCloseTo(0, 9);
    expect(sleep?.p0[0]).toBeCloseTo(1.2, 9);
    expect(sleep?.p1[0]).toBeCloseTo(2.8, 9);
    expect(sleep?.sill).toBe(0.9);
    expect(sleep?.lintel).toBeCloseTo(2.3, 9);

    for (const aperture of apertures) {
      const room = sample.rooms.find((candidate) => candidate.id === aperture.opening.roomId);
      if (!room) throw new Error('Raum fehlt');
      // Vom Fenster nach innen liegt der eigene Raum, nach außen keiner
      const mid: Point = [
        (aperture.p0[0] + aperture.p1[0]) / 2,
        (aperture.p0[1] + aperture.p1[1]) / 2,
      ];
      const inside: Point = [
        mid[0] - aperture.outward[0] * 0.2,
        mid[1] - aperture.outward[1] * 0.2,
      ];
      const outside: Point = [
        mid[0] + aperture.outward[0] * 0.5,
        mid[1] + aperture.outward[1] * 0.5,
      ];
      expect(roomAt(sample.rooms, inside)?.id).toBe(room.id);
      expect(roomAt(sample.rooms, outside)).toBeNull();
    }
  });
});

describe('sunPatches', () => {
  it('lässt die Sonne nur durch Fenster, vor denen sie steht', () => {
    const sample = sampleApartment();
    for (const hours of [7, 9.5, 12, 15.5, 18, 20]) {
      const { toSun } = sunDirection(hours, sample.north);
      const sunny = exteriorWindows(sample)
        .filter((aperture) => dot(toSun, aperture.outward) > SUN_THROUGH)
        .map((aperture) => aperture.opening.roomId)
        .sort();
      expect(
        sunPatches(sample, hours)
          .map((patch) => patch.roomId)
          .sort(),
      ).toEqual(sunny);
    }
  });

  it('fällt um 15:30 Uhr von Südwesten in Wohnzimmer und Küche', () => {
    const rooms = sunPatches(sampleApartment(), 15.5).map((patch) => patch.roomId);
    expect(rooms.sort()).toEqual(['kitchen', 'living', 'living', 'living']);
  });

  it('fällt morgens um 8 Uhr nur durch das Ostfenster der Küche', () => {
    expect(sunPatches(sampleApartment(), 8).map((patch) => patch.roomId)).toEqual(['kitchen']);
  });

  it('liegt vor dem Fenster im Raum, nie draußen', () => {
    const sample = sampleApartment();
    const apertures = exteriorWindows(sample);
    for (const hours of [8, 11, 15.5, 19]) {
      const patches = sunPatches(sample, hours);
      expect(patches.length).toBeGreaterThan(0);
      for (const patch of patches) {
        const aperture = apertures.find((candidate) => candidate.opening.roomId === patch.roomId);
        if (!aperture) throw new Error('Fenster fehlt');
        // Jede Ecke liegt auf der Raumseite der Fensterwand (oder auf ihr bei Brüstung 0)
        for (const corner of patch.polygon) {
          const offset: Point = [corner[0] - aperture.p0[0], corner[1] - aperture.p0[1]];
          expect(dot(offset, aperture.outward)).toBeLessThanOrEqual(1e-9);
        }
      }
    }
  });

  it('dreht mit der Nordrichtung: Zeigt Norden nach unten, kommt die Sonne von oben rechts', () => {
    const turned = { ...sampleApartment(), north: 180 };
    const rooms = new Set(sunPatches(turned, 15.5).map((patch) => patch.roomId));
    // Fenster oben (Schlaf-, Arbeitszimmer, Bad) und das Ostfenster der Küche, nicht das Wohnzimmer
    expect(rooms).toEqual(new Set(['sleep', 'work', 'bath', 'kitchen']));
  });

  it('gibt es nicht durch Fenster in Innenwänden', () => {
    const sample = sampleApartment();
    const apartment = {
      ...sample,
      openings: [...sample.openings, window('f-inner', 'w-living-kitchen', 'kitchen')],
    };
    for (const hours of [8, 12, 15.5, 19]) {
      expect(sunPatches(apartment, hours)).toEqual(sunPatches(sample, hours));
    }
  });

  it('gibt es nachts und bei sehr tiefer Sonne nicht', () => {
    const sample = sampleApartment();
    expect(sunPatches(sample, 22)).toEqual([]);
    expect(sunPatches(sample, 4)).toEqual([]);
    // Kurz nach Sonnenaufgang (5:30 Uhr) steht die Sonne noch unter SUN_MIN_ELEVATION
    expect(sunDirection(5.6, 0).elevation).toBeLessThan(SUN_MIN_ELEVATION);
    expect(sunPatches(sample, 5.6)).toEqual([]);
  });

  it('reicht bei tiefer Sonne weiter in den Raum', () => {
    const sample = sampleApartment();
    // Nur das Westfenster im Wohnzimmer; seine Innenseite liegt bei x = 0
    const west = {
      ...sample,
      openings: sample.openings.filter((opening) => opening.id === 'f-living-west'),
    };
    const depth = (hours: number) => {
      const [patch] = sunPatches(west, hours);
      return Math.max(...(patch?.polygon.map((p) => p[0]) ?? [NaN]));
    };
    // Nachmittags steht die Sonne hoch im Südwesten, abends tief im Westen
    expect(depth(18.5)).toBeGreaterThan(2 * depth(15.5));
  });
});

describe('eveningAmount', () => {
  it('ist am Tag 0 und in der Nacht 1', () => {
    for (const hours of [7, 10, 13.25, 16.5, 19.5]) expect(eveningAmount(hours)).toBe(0);
    for (const hours of [21.5, 22, 23.5, 4]) expect(eveningAmount(hours)).toBe(1);
  });

  it('nimmt in der Dämmerung stetig zu', () => {
    // Ab etwa 20:25 Uhr steht die Sonne unter 8° (Untergang 21 Uhr)
    const values = [20.5, 20.75, 21, 21.25].map(eveningAmount);
    values.forEach((value, index) => {
      expect(value).toBeGreaterThan(0);
      expect(value).toBeLessThan(1);
      if (index > 0) expect(value).toBeGreaterThan(values[index - 1] ?? 1);
    });
  });
});
