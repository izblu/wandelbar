import { describe, expect, it } from 'vitest';
import {
  dollhouseProjection,
  fittedViewport,
  polygonCentroid,
  sceneArea,
  type Orbit,
  type Point2,
  type Projection,
} from '../viewport.ts';
import { sampleApartment, type Apartment, type Wall } from './apartment.ts';
import { buildDollhouse, CUT_HEIGHT, type DollhouseModel } from './dollhouse.ts';
import type { Plane, Vec3 } from './dollhouseLight.ts';
import { apartmentBounds, eveningAmount, sunDirection, sunPatches } from './geometry.ts';

const AREA = sceneArea(1440, 900, 'wide');
const YAWS = [0, 45, 90, 135, 180, 225, 270, 315];

function projectionFor(apartment: Apartment, orbit: Orbit): Projection {
  const bounds = apartmentBounds(apartment);
  return dollhouseProjection(fittedViewport(bounds), orbit, bounds, AREA, CUT_HEIGHT);
}

function lit(apartment: Apartment, orbit: Orbit, sunTime: number | null) {
  const projection = projectionFor(apartment, orbit);
  const model = buildDollhouse(apartment, projection, {
    sunTime,
    evening: sunTime === null ? 0 : eveningAmount(sunTime),
    hitFurniture: false,
  });
  return { model, projection, surfaces: surfacesOf(model) };
}

/** Raum und Ebene jeder Fläche, nach ihrem Schlüssel (so heißen auch die Flächen der Lichtebenen) */
function surfacesOf(model: DollhouseModel) {
  const surfaces = new Map<string, { room: string | null; plane: Plane; itemId?: string }>();
  for (const floor of model.floors) {
    surfaces.set(`${floor.roomId}-floor`, {
      room: floor.roomId,
      plane: { normal: [0, 0, 1], point: [0, 0, 0] },
    });
  }
  for (const face of [...model.flats, ...model.faces]) surfaces.set(face.key, face);
  return surfaces;
}

/** Richtung zur Sonne in Weltkoordinaten (Länge 1) */
function toSun(hours: number, north: number): Vec3 {
  const { toSun: flat, elevation } = sunDirection(hours, north);
  const rise = (elevation * Math.PI) / 180;
  return [flat[0] * Math.cos(rise), flat[1] * Math.cos(rise), Math.sin(rise)];
}

const dot3 = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/**
 * Ein Raum von 4 × 4 m mit Außenwänden und einem bodentiefen Fenster nach Süden, darin eine
 * Kommode im Sonnenstrahl.
 */
function sunRoom(): Apartment {
  const o = 0.15;
  const wall = (id: string, a: Wall['a'], b: Wall['b']): Wall => ({
    id,
    a,
    b,
    thickness: 0.3,
    height: 2.6,
    exterior: true,
  });
  return {
    name: 'Sonnenzimmer',
    source: 'test',
    statedArea: 16,
    scale: 1,
    scaleConfirmed: true,
    north: 0,
    northConfirmed: true,
    walls: [
      wall('w-n', [-o, -o], [4 + o, -o]),
      wall('w-e', [4 + o, -o], [4 + o, 4 + o]),
      wall('w-s', [4 + o, 4 + o], [-o, 4 + o]),
      wall('w-w', [-o, 4 + o], [-o, -o]),
    ],
    openings: [
      {
        id: 'f-s',
        wallId: 'w-s',
        kind: 'window',
        // Von x = 3 bis x = 1 (die Südwand läuft nach Westen)
        offset: 1.15,
        width: 2,
        height: 2.2,
        sill: 0,
        roomId: 'room',
        confidence: 1,
      },
    ],
    rooms: [
      {
        id: 'room',
        name: 'Zimmer',
        polygon: [
          [0, 0],
          [4, 0],
          [4, 4],
          [0, 4],
        ],
        ceiling: 2.6,
        floor: 'oak',
        paint: 'limewash',
        label: [2, 2],
      },
    ],
    furniture: [
      {
        id: 'box',
        kind: 'sideboard',
        name: 'Kommode',
        x: 1.5,
        y: 3.2,
        w: 1,
        d: 0.4,
        height: 50,
        rotation: 0,
        material: 'Holz',
        price: 1,
        onList: false,
        facts: [],
      },
    ],
  };
}

describe('sceneLight: Lampen am Abend', () => {
  it('hellt nur Flächen im Raum der Lampen auf, aus jedem Winkel', () => {
    const sample = sampleApartment();
    for (const yaw of YAWS) {
      const { model, surfaces } = lit(sample, { yaw, tilt: 50 }, 21.5);
      const withLamp = model.light.glow.filter((face) => face.spots.length > 0);
      expect(withLamp.length).toBeGreaterThan(0);
      for (const face of withLamp) {
        // Beide Lampen stehen im Wohnzimmer; Flur und Küche daneben bleiben dunkel
        expect(surfaces.get(face.key)?.room, `${face.key} bei ${String(yaw)}°`).toBe('living');
      }
    }
  });

  it('lässt die Schirme leuchten, gibt aber kein Tageslicht und keine Sonne', () => {
    const { model } = lit(sampleApartment(), { yaw: -28, tilt: 50 }, 21.5);
    const glowing = new Set(
      model.light.glow.filter((face) => face.glow > 0).map((face) => face.itemId),
    );
    expect(glowing).toEqual(new Set(['floor-lamp', 'reading-lamp']));
    expect(model.light.daylight).toEqual([]);
    expect(model.light.glow.every((face) => face.sun === null)).toBe(true);
    expect(model.light.spots.every((spot) => spot.kind === 'lamp')).toBe(true);
  });

  it('beleuchtet eine Lampe nicht selbst', () => {
    const sample = sampleApartment();
    // Nur die Stehlampe: Ihr Fuß und ihre Stange bekommen kein eigenes Licht
    const single = {
      ...sample,
      furniture: sample.furniture.filter((item) => item.id !== 'reading-lamp'),
    };
    for (const yaw of YAWS) {
      const { model } = lit(single, { yaw, tilt: 50 }, 21.5);
      expect(model.light.glow.some((face) => face.spots.length > 0)).toBe(true);
      const own = model.light.glow.filter(
        (face) => face.itemId === 'floor-lamp' && face.glow === 0,
      );
      for (const face of own) expect(face.spots, face.key).toEqual([]);
    }
  });
});

describe('sceneLight: Tageslicht und Sonne', () => {
  it('legt die Sonne nur auf Flächen ihres Raums, die zu ihr zeigen', () => {
    const sample = sampleApartment();
    const hours = 15.5;
    const sunny = new Set(sunPatches(sample, hours).map((patch) => patch.roomId));
    const sun = toSun(hours, sample.north);
    let onFurnitureOrWalls = 0;
    for (const yaw of YAWS) {
      const { model, surfaces } = lit(sample, { yaw, tilt: 50 }, hours);
      const inSun = model.light.glow.filter((face) => face.sun !== null);
      expect(inSun.length).toBeGreaterThan(0);
      for (const face of inSun) {
        const surface = surfaces.get(face.key);
        expect(sunny.has(surface?.room ?? ''), face.key).toBe(true);
        expect(dot3(surface?.plane.normal ?? [0, 0, -1], sun), face.key).toBeGreaterThan(0);
        if (!face.floor) onFurnitureOrWalls += 1;
      }
    }
    // Nicht nur auf dem Boden: auch auf Möbeln und Wänden
    expect(onFurnitureOrWalls).toBeGreaterThan(0);
  });

  it('gibt Räumen ohne Fenster kein Tageslicht', () => {
    for (const yaw of YAWS) {
      const { model, surfaces } = lit(sampleApartment(), { yaw, tilt: 50 }, 11);
      const rooms = new Set(
        model.light.daylight
          .filter((face) => face.spots.length > 0)
          .map((face) => surfaces.get(face.key)?.room),
      );
      expect(rooms.has('living')).toBe(true);
      expect(rooms.has('hall')).toBe(false);
    }
  });

  it('lässt am Tag keine Lampe brennen', () => {
    const { model } = lit(sampleApartment(), { yaw: -28, tilt: 50 }, 13);
    expect(model.light.spots.every((spot) => spot.kind === 'sky')).toBe(true);
    expect(model.light.glow.every((face) => face.glow === 0)).toBe(true);
  });

  it('wirft den Schatten eines Möbels in Lichtrichtung', () => {
    const room = sunRoom();
    for (const hours of [11, 13.25, 15.5]) {
      const { model, projection } = lit(room, { yaw: -28, tilt: 50 }, hours);
      const floor = model.light.glow.find((face) => face.key === 'room-floor');
      expect(floor?.sun, `Sonne auf dem Boden um ${String(hours)} Uhr`).not.toBeNull();
      const [shadow] = floor?.shadows ?? [];
      if (!shadow) throw new Error(`Kein Schatten um ${String(hours)} Uhr`);

      // Schatten auf dem Boden zurückrechnen; er liegt von der Kommode aus vom Fenster weg
      const ground = shadow.map(([x, y]): Point2 => projection.unproject(x, y));
      const [cx, cy] = polygonCentroid(ground) ?? [NaN, NaN];
      const { toSun: flat } = sunDirection(hours, room.north);
      const box: Point2 = [2, 3.4];
      expect((cx - box[0]) * -flat[0] + (cy - box[1]) * -flat[1]).toBeGreaterThan(0.05);
    }
  });

  it('lässt ein Möbel keinen Schatten auf sich selbst werfen', () => {
    const { model } = lit(sunRoom(), { yaw: -28, tilt: 50 }, 13.25);
    const top = model.light.glow.find((face) => face.key === 'box-0-top');
    expect(top?.sun).not.toBeNull();
    expect(top?.shadows).toEqual([]);
  });

  it('gibt ohne Tageszeit (Planungslicht) gar kein Licht', () => {
    const { model } = lit(sampleApartment(), { yaw: -28, tilt: 50 }, null);
    expect(model.light).toEqual({ spots: [], daylight: [], glow: [] });
  });

  it('gibt nachts ohne Lampen gar kein Licht', () => {
    const sample = sampleApartment();
    const dark = { ...sample, furniture: sample.furniture.filter((item) => item.kind !== 'lamp') };
    const { model } = lit(dark, { yaw: -28, tilt: 50 }, 23);
    expect(model.light).toEqual({ spots: [], daylight: [], glow: [] });
  });
});
