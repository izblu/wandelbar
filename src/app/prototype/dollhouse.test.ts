import { describe, expect, it } from 'vitest';
import {
  dollhouseProjection,
  fittedViewport,
  sceneArea,
  type Orbit,
  type Point2,
  type Projection,
} from '../viewport.ts';
import { sampleApartment, type Apartment, type Point } from './apartment.ts';
import {
  buildDollhouse,
  compareForPaint,
  CUT_HEIGHT,
  type DollhouseModel,
  type Face,
} from './dollhouse.ts';
import { apartmentBounds, roomAt } from './geometry.ts';

const AREA = sceneArea(1440, 900, 'wide');

const ORBITS: Orbit[] = [0, 30, 60, 90, 135, 180, 210, 250, 300, 332].flatMap((yaw) =>
  [22, 50, 70].map((tilt) => ({ yaw, tilt })),
);

function projectionFor(orbit: Orbit, apartment: Apartment = sampleApartment()): Projection {
  const bounds = apartmentBounds(apartment);
  return dollhouseProjection(fittedViewport(bounds), orbit, bounds, AREA, CUT_HEIGHT);
}

function build(
  orbit: Orbit,
  options: Partial<Parameters<typeof buildDollhouse>[2]> = {},
  apartment: Apartment = sampleApartment(),
): DollhouseModel {
  return buildDollhouse(apartment, projectionFor(orbit, apartment), {
    sunTime: null,
    evening: 0,
    hitFurniture: false,
    ...options,
  });
}

/** Rechteckige Grundfläche */
function box(x0: number, y0: number, x1: number, y1: number): Point[] {
  return [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
  ];
}

/* ------------------------------------------------------------------ Sichtbarkeit */

function signedArea(points: readonly Point2[]): number {
  let sum = 0;
  points.forEach((p, index) => {
    const q = points[(index + 1) % points.length] ?? p;
    sum += p[0] * q[1] - q[0] * p[1];
  });
  return sum / 2;
}

/** Schnitt zweier konvexer Vielecke auf dem Bildschirm */
function intersection(subject: readonly Point2[], clip: readonly Point2[]): Point2[] {
  const orientation = Math.sign(signedArea(clip));
  let output: Point2[] = [...subject];
  clip.forEach((a, index) => {
    const b = clip[(index + 1) % clip.length] ?? a;
    const side = (p: Point2) =>
      orientation * ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]));
    const input = output;
    output = [];
    input.forEach((p, j) => {
      const q = input[(j + 1) % input.length] ?? p;
      if (side(p) >= 0) output.push(p);
      if (side(p) >= 0 !== side(q) >= 0) {
        const t = side(p) / (side(p) - side(q));
        output.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
      }
    });
  });
  return output;
}

function centroid(points: readonly Point2[]): Point2 {
  let twice = 0;
  let x = 0;
  let y = 0;
  points.forEach((p, index) => {
    const q = points[(index + 1) % points.length] ?? p;
    const cross = p[0] * q[1] - q[0] * p[1];
    twice += cross;
    x += (p[0] + q[0]) * cross;
    y += (p[1] + q[1]) * cross;
  });
  return [x / (3 * twice), y / (3 * twice)];
}

/**
 * Wie hoch der Punkt einer Fläche liegt, der auf dem Bildschirm bei `point` zu sehen ist. Auf
 * einem Sehstrahl liegt, was höher ist, näher am Betrachter (Blick schräg von oben).
 */
function heightAt(projection: Projection, tilt: number, face: Face, point: Point2): number {
  const slope = Math.tan((tilt * Math.PI) / 180);
  const [r0x, r0y] = projection.rotate(0, 0);
  const [r1x, r1y] = projection.rotate(1, 0);
  // Ein Meter höher auf demselben Sehstrahl: so weit verschoben auf dem Boden
  const rise: Point2 = [slope * (r1y - r0y), slope * (r1x - r0x)];
  const ground = projection.unproject(point[0], point[1]);
  const { normal, point: on } = face.plane;
  return (
    (normal[0] * (on[0] - ground[0]) + normal[1] * (on[1] - ground[1]) + normal[2] * on[2]) /
    (normal[0] * rise[0] + normal[1] * rise[1] + normal[2])
  );
}

const isWall = (face: Face) =>
  face.className.startsWith('app-dh-wall') || face.className.startsWith('app-dh-glass');

/**
 * Paare von Flächen, die sich auf dem Bildschirm sichtbar überdecken (über 2 px²). `wrong` sind
 * die, bei denen die hintere zuletzt gemalt wird und die vordere übermalt.
 */
function overlaps(
  model: DollhouseModel,
  projection: Projection,
  tilt: number,
  pick: (a: Face, b: Face) => boolean,
): { checked: number; wrong: string[] } {
  const faces = [...model.flats, ...model.faces];
  const wrong: string[] = [];
  let checked = 0;
  for (let i = 0; i < faces.length; i += 1) {
    for (let j = i + 1; j < faces.length; j += 1) {
      const a = faces[i];
      const b = faces[j];
      if (!a || !b || a.body === b.body || !pick(a, b)) continue;
      const shared = intersection(a.points, b.points);
      if (shared.length < 3 || Math.abs(signedArea(shared)) < 2) continue;
      checked += 1;
      const at = centroid(shared);
      // `a` wird vor `b` gemalt: Das ist falsch, wenn `a` dort deutlich vor `b` liegt
      if (heightAt(projection, tilt, a, at) - heightAt(projection, tilt, b, at) > 0.02) {
        wrong.push(`${a.key} liegt vor ${b.key}, wird aber zuerst gemalt`);
      }
    }
  }
  return { checked, wrong };
}

const between = (first: readonly string[], second: readonly string[]) => (a: Face, b: Face) =>
  (first.includes(a.body) && second.includes(b.body)) ||
  (first.includes(b.body) && second.includes(a.body));

/* ------------------------------------------------------------------ Tests */

describe('compareForPaint', () => {
  const toEast: Point = [1, 0];

  it('malt Flaches (Teppich) vor allem anderen', () => {
    const rug = { footprint: box(0, 0, 2, 2), z0: 0, z1: 0.012, flat: true };
    const table = { footprint: box(0.5, 0.5, 1, 1), z0: 0, z1: 0.45 };
    const far = { footprint: box(-5, -5, -4, -4), z0: 0, z1: 2 };
    expect(compareForPaint(rug, table, toEast)).toBe(-1);
    expect(compareForPaint(table, rug, toEast)).toBe(1);
    expect(compareForPaint(rug, far, [-1, 0])).toBe(-1);
  });

  it('malt, was ganz über einem anderen liegt, zuletzt (Kissen auf der Matratze)', () => {
    const mattress = { footprint: box(0, 0, 1.6, 2), z0: 0.3, z1: 0.48 };
    const pillow = { footprint: box(0.1, 0.1, 0.7, 0.5), z0: 0.48, z1: 0.58 };
    for (const viewer of [toEast, [0, 1], [-0.7, -0.7]] as Point[]) {
      expect(compareForPaint(mattress, pillow, viewer)).toBe(-1);
      expect(compareForPaint(pillow, mattress, viewer)).toBe(1);
    }
  });

  it('malt bei getrennten Grundflächen das Teil auf der Seite des Betrachters zuletzt', () => {
    const west = { footprint: box(0, 0, 1, 1), z0: 0, z1: 1 };
    const east = { footprint: box(2, 0, 3, 1), z0: 0, z1: 1 };
    expect(compareForPaint(west, east, toEast)).toBe(-1);
    expect(compareForPaint(east, west, toEast)).toBe(1);
    expect(compareForPaint(west, east, [-1, 0])).toBe(1);
    // Schräger Blick: Die trennende Achse entscheidet, nicht die Mitte
    expect(compareForPaint(west, east, [0.4, 0.9])).toBe(-1);
  });

  it('nimmt die Achse mit dem größten Abstand, auch bei gedrehten Grundflächen', () => {
    const diamond: Point[] = [
      [1, 0],
      [2, 1],
      [1, 2],
      [0, 1],
    ];
    const beside = { footprint: box(2.2, 0.8, 3, 1.2), z0: 0, z1: 1 };
    const shape = { footprint: diamond, z0: 0, z1: 1 };
    expect(compareForPaint(shape, beside, toEast)).toBe(-1);
    expect(compareForPaint(beside, shape, toEast)).toBe(1);
  });

  it('lässt sich berührende Teile in Blickrichtung trennen (Stuhl am Tisch)', () => {
    const table = { footprint: box(0, 0, 1, 1), z0: 0, z1: 0.75 };
    // 3 cm Überlappung gilt noch als Berührung
    const chair = { footprint: box(0.97, 0.2, 1.4, 0.8), z0: 0, z1: 0.9 };
    expect(compareForPaint(table, chair, toEast)).toBe(-1);
    expect(compareForPaint(chair, table, toEast)).toBe(1);
  });

  it('ist egal (0) ohne trennende Achse oder bei Blick quer zur Trennung', () => {
    const a = { footprint: box(0, 0, 1, 1), z0: 0, z1: 1 };
    const crossing = { footprint: box(0.5, -0.5, 0.7, 1.5), z0: 0, z1: 1 };
    expect(compareForPaint(a, crossing, toEast)).toBe(0);
    expect(compareForPaint(crossing, a, [0, 1])).toBe(0);
    // Getrennt in x, der Betrachter sieht genau in y-Richtung: keiner verdeckt den anderen
    const east = { footprint: box(2, 0, 3, 1), z0: 0, z1: 1 };
    expect(compareForPaint(a, east, [0, 1])).toBe(0);
  });
});

describe('buildDollhouse: Reihenfolge beim Malen', () => {
  it('malt die Kissen in jedem Winkel über Matratze und Bettrahmen', () => {
    let checked = 0;
    for (const orbit of ORBITS) {
      const projection = projectionFor(orbit);
      const result = overlaps(
        build(orbit),
        projection,
        orbit.tilt,
        // Kissen (bed-3, bed-4) gegen Rahmen (bed-1) und Matratze (bed-2)
        between(['bed-3', 'bed-4'], ['bed-1', 'bed-2']),
      );
      expect(result.wrong, `Drehung ${String(orbit.yaw)}°`).toEqual([]);
      // Die Kissen liegen auf der Matratze: Sie überdecken sie in jedem Winkel
      expect(result.checked).toBeGreaterThan(0);
      checked += result.checked;
    }
    expect(checked).toBeGreaterThan(ORBITS.length);
  });

  it('malt die Tischplatte in jedem Winkel über die Sitzflächen der Stühle', () => {
    let checked = 0;
    for (const orbit of ORBITS) {
      const result = overlaps(
        build(orbit, { sunTime: 15.5 }),
        projectionFor(orbit),
        orbit.tilt,
        // Je Stuhl Sitz und Lehne, zuletzt die Platte (dining-8)
        between(['dining-8'], ['dining-0', 'dining-2', 'dining-4', 'dining-6']),
      );
      expect(result.wrong, `Drehung ${String(orbit.yaw)}°`).toEqual([]);
      checked += result.checked;
    }
    // Die Sitze stehen unter der Platte; sichtbar überdecken sie sich nur in manchen Winkeln
    expect(checked).toBeGreaterThan(0);
  });

  it('malt die Stuhllehnen vorn über die Tischkante und hinten darunter', () => {
    let checked = 0;
    for (const orbit of ORBITS) {
      const result = overlaps(
        build(orbit),
        projectionFor(orbit),
        orbit.tilt,
        // Lehnen nördlich (dining-1, -5) und südlich (dining-3, -7) des Tischs
        between(['dining-8'], ['dining-1', 'dining-3', 'dining-5', 'dining-7']),
      );
      expect(result.wrong, `Drehung ${String(orbit.yaw)}°`).toEqual([]);
      checked += result.checked;
    }
    expect(checked).toBeGreaterThan(ORBITS.length);
  });

  it('übermalt in keinem Winkel eine vordere Fläche (außer Wand an Wand)', () => {
    // Wände durchdringen sich an Ecken und Stößen (D-028); dort entscheidet die Tiefe der Mitte
    for (const orbit of ORBITS) {
      const result = overlaps(
        build(orbit),
        projectionFor(orbit),
        orbit.tilt,
        (a, b) => !(isWall(a) && isWall(b)),
      );
      expect(result.wrong, `Drehung ${String(orbit.yaw)}°, Neigung ${String(orbit.tilt)}°`).toEqual(
        [],
      );
    }
  });
});

describe('buildDollhouse: Modell', () => {
  it('zeichnet nur Seiten, die zum Betrachter zeigen, und jede Deckfläche', () => {
    const projection = projectionFor({ yaw: -28, tilt: 50 });
    const { faces } = build({ yaw: -28, tilt: 50 });
    const base = projection.depth(0, 0, 0);
    const toViewer = [projection.depth(1, 0, 0) - base, projection.depth(0, 1, 0) - base];
    for (const face of faces) {
      const [nx, ny, nz] = face.plane.normal;
      if (nz === 1) continue;
      expect(nx * (toViewer[0] ?? 0) + ny * (toViewer[1] ?? 0)).toBeGreaterThan(0);
    }
    for (const body of new Set(faces.map((face) => face.body))) {
      expect(faces.some((face) => face.body === body && face.key.endsWith('-top'))).toBe(true);
    }
  });

  it('legt Teppiche flach unter alles andere', () => {
    const model = build({ yaw: 40, tilt: 50 }, { hitFurniture: true });
    expect(model.flats.length).toBeGreaterThan(0);
    expect(new Set(model.flats.map((face) => face.itemId))).toEqual(new Set(['rug']));
    expect(model.faces.some((face) => face.itemId === 'rug')).toBe(false);
    expect(model.floors.map((floor) => floor.roomId)).toEqual(
      sampleApartment().rooms.map((room) => room.id),
    );
  });

  it('macht Möbel nur antippbar, wenn gewünscht, Wände nie', () => {
    const off = build({ yaw: -28, tilt: 50 });
    expect(off.faces.every((face) => face.hit === undefined)).toBe(true);
    const on = build({ yaw: -28, tilt: 50 }, { hitFurniture: true });
    for (const face of on.faces) {
      if (face.itemId) expect(face.hit).toBe(`furniture:${face.itemId}`);
      else expect(face.hit).toBeUndefined();
    }
  });

  it('streicht jedes Wandstück in der Farbe des Raums, an den es grenzt', () => {
    const sample = sampleApartment();
    const paints = new Map(sample.rooms.map((room) => [room.id, room.paint]));
    for (const yaw of [0, 90, 180, 270]) {
      const sides = build({ yaw, tilt: 50 }).faces.filter(
        (face) => face.className === 'app-dh-wall' && face.room !== null,
      );
      expect(sides.length).toBeGreaterThan(0);
      for (const face of sides) {
        expect(face.fill, face.key).toContain(`--paint-${paints.get(face.room ?? '') ?? ''}`);
      }
    }
  });

  it('färbt beim Streichen eines Raums genau dessen Wände um, alle vier', () => {
    const sample = sampleApartment();
    const rose = {
      ...sample,
      rooms: sample.rooms.map((room) => (room.id === 'sleep' ? { ...room, paint: 'rose' } : room)),
    };
    const walls = new Set<string>();
    for (const yaw of [0, 90, 180, 270]) {
      const { faces } = build({ yaw, tilt: 50 }, {}, rose);
      for (const face of faces) {
        if (!face.fill.includes('--paint-rose')) continue;
        expect(face.room, face.key).toBe('sleep');
        const wall = sample.walls.find((candidate) => face.body.startsWith(`${candidate.id}-`));
        if (wall) walls.add(wall.id);
      }
    }
    expect(walls).toEqual(new Set(['w-north', 'w-west', 'w-sleep-work', 'w-rooms-hall']));
  });

  it('zeigt mit jeder Wandseite in ihren eigenen Raum, Kappen und Glas gehören keinem', () => {
    const sample = sampleApartment();
    for (const yaw of [20, 200]) {
      const { faces } = build({ yaw, tilt: 50 }, { sunTime: 15.5 });
      for (const face of faces.filter(isWall)) {
        const { normal, point } = face.plane;
        if (normal[2] === 1 || face.className === 'app-dh-glass') {
          expect(face.room).toBeNull();
          continue;
        }
        if (face.room === null) continue;
        // Knapp vor der Seite liegt ihr Raum, an Ecken und Stößen die Nachbarwand, nie ein anderer
        const front: Point = [point[0] + normal[0] * 0.08, point[1] + normal[1] * 0.08];
        const room = roomAt(sample.rooms, front)?.id ?? face.room;
        expect(room, face.key).toBe(face.room);
      }
    }
  });

  it('ordnet Möbel dem Raum unter ihrer Mitte zu', () => {
    const sample = sampleApartment();
    const { faces } = build({ yaw: -28, tilt: 50 }, { sunTime: 15.5 });
    const rooms = new Map(
      sample.furniture.map((item) => [
        item.id,
        roomAt(sample.rooms, [item.x + item.w / 2, item.y + item.d / 2])?.id ?? null,
      ]),
    );
    for (const face of faces) {
      if (face.itemId) expect(face.room).toBe(rooms.get(face.itemId));
    }
    expect(rooms.get('bed')).toBe('sleep');
    expect(rooms.get('dining')).toBe('kitchen');
  });

  it('zeigt im Planungslicht die Farben wie gezeichnet und kein Licht', () => {
    const model = build({ yaw: -28, tilt: 50 });
    expect(model.light).toEqual({ spots: [], daylight: [], glow: [] });
    expect(model.floors.find((floor) => floor.roomId === 'living')?.fill).toBe('var(--floor-oak)');
    expect(model.faces.some((face) => face.fill.includes('--scene-indoor'))).toBe(false);
  });

  it('dunkelt am Tag innen ab, Wandkappen nicht', () => {
    const model = build({ yaw: -28, tilt: 50 }, { sunTime: 13 });
    for (const floor of model.floors) expect(floor.fill).toContain('--scene-indoor');
    for (const face of model.faces) {
      if (face.itemId) expect(face.fill).toContain('--scene-indoor');
      if (isWall(face) && face.plane.normal[2] === 1) {
        expect(face.fill).not.toContain('--scene-indoor');
      }
    }
  });

  it('lässt die Lampenschirme nur am Abend leuchten', () => {
    const shades = (evening: number) =>
      build({ yaw: -28, tilt: 50 }, { sunTime: 21.5, evening })
        .faces.filter((face) => face.body === 'floor-lamp-2' || face.body === 'reading-lamp-2')
        .map((face) => face.glow ?? false);
    expect(shades(1).length).toBeGreaterThan(0);
    expect(shades(1).every(Boolean)).toBe(true);
    expect(shades(0).some(Boolean)).toBe(false);
  });
});
