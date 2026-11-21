import type { Point2, Projection } from '../viewport.ts';
import {
  FABRICS,
  FLOORS,
  PAINTS,
  swatchColor,
  type Apartment,
  type Furniture,
  type Point,
  type Room,
  type Wall,
} from './apartment.ts';
import {
  INDOOR_SHADE,
  sceneLight,
  SHADE,
  type LitSurface,
  type Occluder,
  type SceneLight,
} from './dollhouseLight.ts';
import { along, roomAt, wallFrame, wallPieces, wallQuad } from './geometry.ts';

/**
 * Platzhalter-Puppenhaus: Wände (oben abgeschnitten) und Möbel als Quader, schräg von oben
 * gesehen und nach Tiefe sortiert (Maleralgorithmus). Ersetzt durch das echte 3D in M3.
 */

/** Höhe, auf der die Wände abgeschnitten sind */
export const CUT_HEIGHT = 1.15;
/** Lange Wände werden in Stücke geteilt, damit die Sortierung nach Tiefe stimmt */
const WALL_CHUNK = 0.6;

export interface Face extends LitSurface {
  fill: string;
  hit?: string;
}

interface Prism {
  key: string;
  footprint: Point[];
  z0: number;
  z1: number;
  top: string;
  /** Füllung einer Seitenfläche nach ihrer Außennormalen (Welt) */
  side: (normal: Point) => string;
  /** Raum einer Fläche (Seite nach ihrer Außennormalen, `null` = Deckfläche) */
  room: (normal: Point | null) => string | null;
  /** Liegt die Fläche innen? Dann ist sie am Tag ohne Tageslicht dunkler */
  indoor: (normal: Point | null) => boolean;
  className: string;
  hit?: string;
  itemId?: string;
  /** Kanten, die nicht gezeichnet werden (innere Stoßstellen langer Wände) */
  skipEdges?: readonly number[];
  /** Flaches zuerst, unabhängig von der Tiefe */
  flat?: boolean;
  glow?: boolean;
}

export interface DollhouseModel {
  floors: { roomId: string; points: Point2[]; fill: string }[];
  /** Flaches (Teppiche): über dem Boden, unter allem anderen */
  flats: Face[];
  /** Alles Übrige in Malreihenfolge */
  faces: Face[];
  /** Tageslicht, Sonne und Lampen; leer im gleichmäßigen Planungslicht */
  light: SceneLight;
}

const shaded = (fill: string, percent: number) =>
  percent <= 0 ? fill : `color-mix(in oklab, ${fill}, var(--scene-shade) ${percent.toFixed(0)}%)`;

function centroid(points: readonly Point[]): Point {
  const sum = points.reduce<[number, number]>((acc, p) => [acc[0] + p[0], acc[1] + p[1]], [0, 0]);
  return [sum[0] / points.length, sum[1] / points.length];
}

/* ------------------------------------------------------------------ Reihenfolge beim Malen */

/** Überlappung bis zu dieser Tiefe gilt noch als Berührung (Möbel an der Wand, Stühle am Tisch) */
const TOUCH = 0.05;
const EPS = 1e-3;

/** Vorzeichen des Vergleichs: negativ = `a` zuerst malen, positiv = `b` zuerst, 0 = egal */
type Order = -1 | 0 | 1;

/**
 * Muss `a` vor `b` gemalt werden? Für senkrechte Quader mit konvexer Grundfläche, schräg von oben
 * gesehen:
 * - Flaches (Teppich) liegt unter allem.
 * - Liegt ein Teil ganz über dem anderen, kann das untere es nie verdecken: oben zuletzt.
 * - Sonst trennt eine senkrechte Ebene die Grundflächen; das Teil auf der Seite des Betrachters
 *   kann das andere verdecken, nicht umgekehrt: vorn zuletzt.
 * `toViewer` ist die waagerechte Richtung zum Betrachter in Weltkoordinaten.
 */
export function compareForPaint(
  a: Pick<Prism, 'footprint' | 'z0' | 'z1' | 'flat'>,
  b: Pick<Prism, 'footprint' | 'z0' | 'z1' | 'flat'>,
  toViewer: Point,
): Order {
  const flatA = a.flat ?? false;
  const flatB = b.flat ?? false;
  if (flatA !== flatB) return flatA ? -1 : 1;
  if (a.z1 <= b.z0 + EPS) return -1;
  if (b.z1 <= a.z0 + EPS) return 1;

  // Trennende Achse mit dem größten Abstand (Satz der trennenden Achsen)
  let best = -Infinity;
  let order: Order = 0;
  for (const polygon of [a.footprint, b.footprint]) {
    polygon.forEach((p, index) => {
      const q = polygon[(index + 1) % polygon.length] ?? p;
      const length = Math.hypot(q[0] - p[0], q[1] - p[1]);
      if (length < EPS) return;
      const n: Point = [(q[1] - p[1]) / length, -(q[0] - p[0]) / length];
      const [aMin, aMax] = extent(a.footprint, n);
      const [bMin, bMax] = extent(b.footprint, n);
      const facing = n[0] * toViewer[0] + n[1] * toViewer[1];
      // a liegt auf der negativen Seite von b, oder umgekehrt
      for (const [gap, aBehind] of [
        [bMin - aMax, true],
        [aMin - bMax, false],
      ] as const) {
        if (gap <= best) continue;
        best = gap;
        if (Math.abs(facing) < EPS) order = 0;
        else order = facing > 0 === aBehind ? -1 : 1;
      }
    });
  }
  return best > -TOUCH ? order : 0;
}

function extent(points: readonly Point[], axis: Point): [number, number] {
  let min = Infinity;
  let max = -Infinity;
  for (const [x, y] of points) {
    const value = x * axis[0] + y * axis[1];
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  return [min, max];
}

/**
 * Reihenfolge beim Malen (Maleralgorithmus): nur Teile, die sich auf dem Bildschirm überdecken
 * können, werden verglichen, dann topologisch sortiert. Bleibt ein Kreis übrig (selten, bei sich
 * durchdringenden Teilen), entscheidet die Tiefe der Mitte.
 */
function paintOrder(prisms: readonly Prism[], projection: Projection): Prism[] {
  const { project, depth } = projection;
  const base = depth(0, 0, 0);
  const toViewer: Point = [depth(1, 0, 0) - base, depth(0, 1, 0) - base];

  // Ersatzreihenfolge: Flaches zuerst, dann von hinten nach vorn, das Niedrigere zuerst
  const nodes = prisms
    .map((prism) => {
      const c = centroid(prism.footprint);
      let x0 = Infinity;
      let y0 = Infinity;
      let x1 = -Infinity;
      let y1 = -Infinity;
      for (const [x, y] of prism.footprint) {
        for (const z of [prism.z0, prism.z1]) {
          const [sx, sy] = project(x, y, z);
          x0 = Math.min(x0, sx);
          y0 = Math.min(y0, sy);
          x1 = Math.max(x1, sx);
          y1 = Math.max(y1, sy);
        }
      }
      return { prism, depth: depth(c[0], c[1], 0), box: { x0, y0, x1, y1 } };
    })
    .sort(
      (a, b) =>
        Number(b.prism.flat ?? false) - Number(a.prism.flat ?? false) ||
        a.depth - b.depth ||
        a.prism.z1 - b.prism.z1,
    );

  const count = nodes.length;
  const after: number[][] = nodes.map(() => []);
  const waiting = new Array<number>(count).fill(0);
  for (let i = 0; i < count; i += 1) {
    const a = nodes[i];
    if (!a) continue;
    for (let j = i + 1; j < count; j += 1) {
      const b = nodes[j];
      if (!b) continue;
      if (
        a.box.x1 <= b.box.x0 ||
        b.box.x1 <= a.box.x0 ||
        a.box.y1 <= b.box.y0 ||
        b.box.y1 <= a.box.y0
      ) {
        continue;
      }
      const order = compareForPaint(a.prism, b.prism, toViewer);
      if (order < 0) {
        after[i]?.push(j);
        waiting[j] = (waiting[j] ?? 0) + 1;
      } else if (order > 0) {
        after[j]?.push(i);
        waiting[i] = (waiting[i] ?? 0) + 1;
      }
    }
  }

  // Immer das erste freie Teil in der Ersatzreihenfolge; bei einem Kreis das erste übrige
  const done = new Array<boolean>(count).fill(false);
  const result: Prism[] = [];
  for (let step = 0; step < count; step += 1) {
    let next = -1;
    for (let k = 0; k < count; k += 1) {
      if (done[k]) continue;
      if (next < 0) next = k;
      if (waiting[k] === 0) {
        next = k;
        break;
      }
    }
    const node = nodes[next];
    if (!node) break;
    done[next] = true;
    result.push(node.prism);
    for (const k of after[next] ?? []) waiting[k] = (waiting[k] ?? 0) - 1;
  }
  return result;
}

/** Rechteck eines Möbelteils (Meter, relativ zur ungedrehten Ecke) in Weltkoordinaten */
function itemRect(item: Furniture, x0: number, y0: number, x1: number, y1: number): Point[] {
  const cx = item.x + item.w / 2;
  const cy = item.y + item.d / 2;
  const angle = (item.rotation * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const corner = (px: number, py: number): Point => {
    const dx = item.x + px - cx;
    const dy = item.y + py - cy;
    return [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos];
  };
  return [corner(x0, y0), corner(x1, y0), corner(x1, y1), corner(x0, y1)];
}

interface Part {
  rect: [number, number, number, number];
  z0: number;
  z1: number;
  fill: string;
  top?: string;
  glow?: boolean;
}

function furnitureParts(item: Furniture, evening: number): Part[] {
  const { w, d } = item;
  const h = Math.max(0.01, item.height / 100);
  const fabric = swatchColor(FABRICS, item.swatch);
  const full: Part['rect'] = [0, 0, w, d];
  switch (item.kind) {
    case 'sofa':
    case 'armchair': {
      const arm = item.kind === 'sofa' ? Math.min(0.2, w * 0.08) : w * 0.16;
      const seat = Math.min(0.44, h);
      return [
        { rect: [0, 0, w, d * 0.26], z0: 0, z1: h, fill: fabric },
        { rect: [arm, d * 0.26, w - arm, d], z0: 0, z1: seat, fill: fabric },
        { rect: [0, d * 0.26, arm, d], z0: 0, z1: Math.min(h, 0.62), fill: fabric },
        { rect: [w - arm, d * 0.26, w, d], z0: 0, z1: Math.min(h, 0.62), fill: fabric },
      ];
    }
    case 'bed':
      return [
        { rect: [0, 0, w, 0.08], z0: 0, z1: 0.95, fill: 'var(--scene-wood)' },
        { rect: [0, 0.08, w, d], z0: 0, z1: 0.3, fill: 'var(--scene-wood)' },
        { rect: [0.05, 0.1, w - 0.05, d - 0.04], z0: 0.3, z1: 0.48, fill: 'var(--scene-linen)' },
        { rect: [0.12, 0.16, w / 2 - 0.06, 0.52], z0: 0.48, z1: 0.58, fill: 'var(--scene-linen)' },
        {
          rect: [w / 2 + 0.06, 0.16, w - 0.12, 0.52],
          z0: 0.48,
          z1: 0.58,
          fill: 'var(--scene-linen)',
        },
      ];
    case 'dining': {
      const c = 0.42;
      // Sitz und Lehne stoßen aneinander: Durchdrängen sie sich, lässt sich die Reihenfolge beim
      // Malen nicht bestimmen, und der Sitz schöbe sich in manchen Winkeln über die Lehne
      const back = 0.06;
      const chairs: Part[] = [0.25, 0.75].flatMap((t) => [
        {
          rect: [w * t - c / 2, -c * 0.75 + back, w * t + c / 2, -c * 0.75 + c],
          z0: 0,
          z1: 0.46,
          fill: 'var(--scene-furniture)',
        },
        {
          rect: [w * t - c / 2, -c * 0.75, w * t + c / 2, -c * 0.75 + back],
          z0: 0,
          z1: 0.86,
          fill: 'var(--scene-furniture)',
        },
        {
          rect: [w * t - c / 2, d + c * 0.75 - c, w * t + c / 2, d + c * 0.75 - back],
          z0: 0,
          z1: 0.46,
          fill: 'var(--scene-furniture)',
        },
        {
          rect: [w * t - c / 2, d + c * 0.75 - back, w * t + c / 2, d + c * 0.75],
          z0: 0,
          z1: 0.86,
          fill: 'var(--scene-furniture)',
        },
      ]);
      return [...chairs, { rect: full, z0: 0.68, z1: h, fill: 'var(--scene-wood)' }];
    }
    case 'officeChair':
      return [
        {
          rect: [w * 0.15, d * 0.15, w * 0.85, d * 0.85],
          z0: 0,
          z1: 0.48,
          fill: 'var(--scene-furniture)',
        },
        {
          rect: [w * 0.15, d * 0.74, w * 0.85, d * 0.86],
          z0: 0.48,
          z1: h,
          fill: 'var(--scene-furniture)',
        },
      ];
    case 'lamp': {
      const lit = evening > 0.4;
      const pole = 0.04;
      const shade = w * 0.7;
      return [
        {
          rect: [w * 0.25, d * 0.25, w * 0.75, d * 0.75],
          z0: 0,
          z1: 0.03,
          fill: 'var(--scene-furniture)',
        },
        {
          rect: [w / 2 - pole / 2, d / 2 - pole / 2, w / 2 + pole / 2, d / 2 + pole / 2],
          z0: 0.03,
          z1: h - SHADE,
          fill: 'var(--scene-furniture)',
        },
        {
          rect: [w / 2 - shade / 2, d / 2 - shade / 2, w / 2 + shade / 2, d / 2 + shade / 2],
          z0: h - SHADE,
          z1: h,
          fill: lit ? 'var(--scene-lamp)' : 'var(--scene-linen)',
          glow: lit,
        },
      ];
    }
    case 'plant':
      return [
        {
          rect: [w * 0.25, d * 0.25, w * 0.75, d * 0.75],
          z0: 0,
          z1: 0.35,
          fill: 'var(--floor-terracotta)',
        },
        {
          rect: [w * 0.05, d * 0.05, w * 0.95, d * 0.95],
          z0: 0.35,
          z1: h,
          fill: 'var(--scene-plant)',
        },
      ];
    case 'rug':
      return [{ rect: full, z0: 0, z1: 0.012, fill: 'var(--scene-rug)' }];
    case 'toilet':
      return [
        { rect: [0, 0, w, d * 0.3], z0: 0, z1: 0.8, fill: 'var(--scene-linen)' },
        { rect: [w * 0.08, d * 0.3, w * 0.92, d], z0: 0, z1: 0.4, fill: 'var(--scene-linen)' },
      ];
    case 'bathtub':
    case 'washbasin':
      return [{ rect: full, z0: 0, z1: h, fill: 'var(--scene-linen)', top: 'var(--scene-water)' }];
    case 'kitchen':
      return [{ rect: full, z0: 0, z1: h, fill: 'var(--scene-wood)', top: 'var(--scene-counter)' }];
    case 'coffeeTable':
    case 'desk':
    case 'nightstand':
    case 'sideboard':
      return [{ rect: full, z0: 0, z1: h, fill: 'var(--scene-wood)' }];
    case 'wardrobe':
    case 'shelf':
      return [{ rect: full, z0: 0, z1: h, fill: 'var(--scene-furniture)' }];
  }
}

/** Abschnitt entlang einer Wandseite, der zu einem Raum gehört (Meter ab `wall.a`) */
interface RoomSpan {
  t0: number;
  t1: number;
  room: Room;
}

/**
 * Wo Räume an einer Seite der Wand anliegen: Die Linie knapp neben der Wand wird mit den Umrissen der
 * Räume geschnitten. Nach Lage sortiert.
 */
function roomSpans(wall: Wall, rooms: readonly Room[], side: 1 | -1): RoomSpan[] {
  const { dir, normal } = wallFrame(wall);
  const offset = side * (wall.thickness / 2 + 0.06);
  const spans: RoomSpan[] = [];
  for (const room of rooms) {
    // Schnittpunkte mit dem Umriss; dazwischen abwechselnd innen und außen
    const cuts: number[] = [];
    room.polygon.forEach((p, index) => {
      const q = room.polygon[(index + 1) % room.polygon.length] ?? p;
      const dp = (p[0] - wall.a[0]) * normal[0] + (p[1] - wall.a[1]) * normal[1] - offset;
      const dq = (q[0] - wall.a[0]) * normal[0] + (q[1] - wall.a[1]) * normal[1] - offset;
      if (dp < 0 === dq < 0) return;
      const s = dp / (dp - dq);
      const x = p[0] + (q[0] - p[0]) * s - wall.a[0];
      const y = p[1] + (q[1] - p[1]) * s - wall.a[1];
      cuts.push(x * dir[0] + y * dir[1]);
    });
    cuts.sort((a, b) => a - b);
    for (let index = 0; index + 1 < cuts.length; index += 2) {
      const t0 = cuts[index];
      const t1 = cuts[index + 1];
      if (t0 !== undefined && t1 !== undefined) spans.push({ t0, t1, room });
    }
  }
  return spans.sort((a, b) => a.t0 - b.t0);
}

/**
 * Welcher Raum zu welchem Teil eines Laufs von `t0` bis `t1` gehört. Es zählen nur Räume, die am
 * Lauf anliegen; ein Raum hinter einer Querwand am Ende des Laufs teilt nichts ab, sonst entstünde
 * dort ein winziges Stück in der Querwand. Jeder Raum reicht bis zu `reach` über sein Ende hinaus,
 * damit Ecken und Stöße zu ihm gehören; zwischen zwei Räumen liegt die Grenze in der Mitte der
 * Lücke, also in der Querwand. Außerhalb aller Zonen ist Fassade.
 */
function runZones(spans: readonly RoomSpan[], t0: number, t1: number, reach: number): RoomSpan[] {
  const near = spans.filter((span) => span.t0 < t1 - EPS && span.t1 > t0 + EPS);
  return near.map((span, index) => {
    const before = near[index - 1];
    const after = near[index + 1];
    return {
      t0: Math.max(span.t0 - reach, before ? (before.t1 + span.t0) / 2 : -Infinity),
      t1: Math.min(span.t1 + reach, after ? (span.t1 + after.t0) / 2 : Infinity),
      room: span.room,
    };
  });
}

export function buildDollhouse(
  apartment: Apartment,
  projection: Projection,
  options: { sunTime: number | null; evening: number; hitFurniture: boolean },
): DollhouseModel {
  const { project } = projection;
  // Richtung in der gedrehten Ansicht ohne Verschiebung
  const origin = projection.rotate(0, 0);
  const turn = (v: Point): Point2 => {
    const r = projection.rotate(v[0], v[1]);
    return [r[0] - origin[0], r[1] - origin[1]];
  };
  const shadeFor = (normal: Point): number => {
    const [rx, ry] = turn(normal);
    const lit = Math.max(-1, Math.min(1, 0.6 * ry - 0.5 * rx));
    return 24 - 14 * lit;
  };
  // Am Tag ist innen alles dunkler; das Tageslicht (dollhouseLight.ts) hebt es am Fenster wieder an
  const indoorShade = options.sunTime === null ? 0 : INDOOR_SHADE * (1 - options.evening);
  const inside = (fill: string, indoor: boolean) =>
    indoor && indoorShade > 0
      ? `color-mix(in srgb, ${fill}, var(--scene-indoor) ${(indoorShade * 100).toFixed(1)}%)`
      : fill;

  const floors = apartment.rooms.map((room) => ({
    roomId: room.id,
    points: room.polygon.map(([x, y]) => project(x, y, 0)),
    fill: inside(swatchColor(FLOORS, room.floor), true),
  }));

  const prisms: Prism[] = [];
  const roomIdAt = (p: Point): string | null => roomAt(apartment.rooms, p)?.id ?? null;

  // Wände: Stücke zwischen Öffnungen, an Raumgrenzen und in kurze Abschnitte geteilt
  /** Bis zu dieser Entfernung gehört ein Wandstück noch zum nächsten Raum (Ecken, Stöße) */
  const reach = Math.max(0, ...apartment.walls.map((wall) => wall.thickness)) + 0.05;
  const paintOf = (room: Room | null): string =>
    room ? swatchColor(PAINTS, room.paint) : 'var(--scene-facade)';
  for (const wall of apartment.walls) {
    const { normal } = wallFrame(wall);
    // Farbe und Licht je Stück: Eine lange Wand kann auf einer Seite an mehrere Räume grenzen
    const spans = {
      plus: roomSpans(wall, apartment.rooms, 1),
      minus: roomSpans(wall, apartment.rooms, -1),
    };
    const roomIn = (zones: readonly RoomSpan[], t: number): Room | null =>
      zones.find((zone) => t >= zone.t0 && t < zone.t1)?.room ?? null;
    /** Seite der Wand, auf die eine Fläche zeigt; 0 bei Stirnseiten (Laibungen, Enden) */
    const sideOf = (n: Point): 1 | -1 | 0 => {
      const facing = n[0] * normal[0] + n[1] * normal[1];
      return Math.abs(facing) < 0.5 ? 0 : facing > 0 ? 1 : -1;
    };
    const addRun = (t0: number, t1: number, z0: number, z1: number, key: string) => {
      // Raumgrenzen beider Seiten teilen den Lauf: Jedes Stück liegt je Seite an nur einem Raum
      const zones = {
        plus: runZones(spans.plus, t0, t1, reach),
        minus: runZones(spans.minus, t0, t1, reach),
      };
      const marks = [...zones.plus, ...zones.minus]
        .flatMap((zone) => [zone.t0, zone.t1])
        .filter((t) => t > t0 + EPS && t < t1 - EPS)
        .sort((a, b) => a - b);
      const bounds = [t0];
      for (const end of [...marks, t1]) {
        const start = bounds[bounds.length - 1] ?? t0;
        if (end - start < EPS) continue;
        const parts = Math.max(1, Math.ceil((end - start) / WALL_CHUNK));
        for (let part = 1; part <= parts; part += 1) {
          bounds.push(start + ((end - start) * part) / parts);
        }
      }
      const count = bounds.length - 1;
      for (let index = 0; index < count; index += 1) {
        const a = bounds[index] ?? t0;
        const b = bounds[index + 1] ?? t1;
        const skip: number[] = [];
        // Kante 1 liegt bei b, Kante 3 bei a (Reihenfolge aus wallQuad)
        if (index < count - 1) skip.push(1);
        if (index > 0) skip.push(3);
        const plus = roomIn(zones.plus, (a + b) / 2);
        const minus = roomIn(zones.minus, (a + b) / 2);
        const paints = { plus: paintOf(plus), minus: paintOf(minus) };
        const lightRooms = { plus: plus?.id ?? null, minus: minus?.id ?? null };
        prisms.push({
          key: `${wall.id}-${key}-${String(index)}`,
          footprint: wallQuad(wall, a, b),
          z0,
          z1,
          top: z1 >= CUT_HEIGHT - 0.001 ? 'var(--scene-wall-cap)' : 'var(--scene-wall)',
          side: (n) => {
            const side = sideOf(n);
            const base = side === 0 ? 'var(--scene-wall)' : side > 0 ? paints.plus : paints.minus;
            return shaded(base, shadeFor(n));
          },
          // Die Kappe ist eine Schnittfläche: Kein Schein fällt über die Wand in den Nachbarraum
          room: (n) => {
            const side = n ? sideOf(n) : 0;
            return side === 0 ? null : side > 0 ? lightRooms.plus : lightRooms.minus;
          },
          // Innen: Seiten zu einem Raum und Laibungen; außen: Fassade und Kappe (Schnittfläche)
          indoor: (n) => {
            if (!n) return false;
            const side = sideOf(n);
            return side === 0 || (side > 0 ? lightRooms.plus : lightRooms.minus) !== null;
          },
          className: 'app-dh-wall',
          skipEdges: skip,
        });
      }
    };
    wallPieces(wall, apartment.openings).forEach((piece, index) => {
      addRun(piece.t0, piece.t1, 0, CUT_HEIGHT, `p${String(index)}`);
    });
    // Fenster: Brüstung, Glas, Sturz
    for (const opening of apartment.openings) {
      if (opening.wallId !== wall.id || opening.kind !== 'window') continue;
      const t0 = opening.offset;
      const t1 = opening.offset + opening.width;
      const sill = Math.min(opening.sill, CUT_HEIGHT);
      const lintel = Math.min(opening.sill + opening.height, CUT_HEIGHT);
      if (sill > 0.001) addRun(t0, t1, 0, sill, `${opening.id}-sill`);
      if (lintel > sill) {
        prisms.push({
          key: `${opening.id}-glass`,
          footprint: glassQuad(wall, t0, t1),
          z0: sill,
          z1: lintel,
          top: 'var(--scene-glass)',
          side: () => 'var(--scene-glass)',
          room: () => null,
          indoor: () => false,
          className: 'app-dh-glass',
        });
      }
      if (lintel < CUT_HEIGHT - 0.001) addRun(t0, t1, lintel, CUT_HEIGHT, `${opening.id}-lintel`);
    }
  }

  // Möbel
  for (const item of apartment.furniture) {
    const room = roomIdAt([item.x + item.w / 2, item.y + item.d / 2]);
    furnitureParts(item, options.evening).forEach((part, index) => {
      const [x0, y0, x1, y1] = part.rect;
      prisms.push({
        key: `${item.id}-${String(index)}`,
        footprint: itemRect(item, x0, y0, x1, y1),
        z0: part.z0,
        z1: part.z1,
        top: part.top ?? part.fill,
        side: (normal) => shaded(part.fill, shadeFor(normal)),
        room: () => room,
        indoor: () => room !== null,
        className: 'app-dh-item',
        hit: options.hitFurniture ? `furniture:${item.id}` : undefined,
        itemId: item.id,
        flat: item.kind === 'rug',
        glow: part.glow,
      });
    });
  }

  const flats: Face[] = [];
  const faces: Face[] = [];
  for (const prism of paintOrder(prisms, projection)) {
    const { footprint, z0, z1 } = prism;
    const c = centroid(footprint);
    const target = prism.flat ? flats : faces;
    footprint.forEach((p, index) => {
      if (prism.skipEdges?.includes(index)) return;
      const q = footprint[(index + 1) % footprint.length] ?? p;
      let normal: Point = [q[1] - p[1], -(q[0] - p[0])];
      const mid: Point = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
      if (normal[0] * (mid[0] - c[0]) + normal[1] * (mid[1] - c[1]) < 0)
        normal = [-normal[0], -normal[1]];
      const length = Math.hypot(normal[0], normal[1]) || 1;
      normal = [normal[0] / length, normal[1] / length];
      if (turn(normal)[1] <= 0.001) return;
      target.push({
        key: `${prism.key}-s${String(index)}`,
        points: [
          project(p[0], p[1], z0),
          project(q[0], q[1], z0),
          project(q[0], q[1], z1),
          project(p[0], p[1], z1),
        ],
        fill: inside(prism.side(normal), prism.indoor(normal)),
        className: prism.className,
        hit: prism.hit,
        itemId: prism.itemId,
        room: prism.room(normal),
        plane: { normal: [normal[0], normal[1], 0], point: [mid[0], mid[1], z0] },
        body: prism.key,
        glow: prism.glow,
      });
    });
    target.push({
      key: `${prism.key}-top`,
      points: footprint.map(([x, y]) => project(x, y, z1)),
      fill: inside(prism.top, prism.indoor(null)),
      className: `${prism.className} app-dh-top`,
      hit: prism.hit,
      itemId: prism.itemId,
      room: prism.room(null),
      plane: { normal: [0, 0, 1], point: [c[0], c[1], z1] },
      body: prism.key,
      glow: prism.glow,
    });
  }

  // Möbel werfen Schatten in der Sonne; Teppiche liegen flach und halten nichts ab
  const occluders: Occluder[] = prisms
    .filter((prism) => prism.className === 'app-dh-item' && !prism.flat)
    .map(({ key, footprint, z0, z1, room }) => ({ key, footprint, z0, z1, room: room(null) }));

  const light =
    options.sunTime === null
      ? { spots: [], daylight: [], glow: [] }
      : sceneLight(apartment, projection, floors, [...flats, ...faces], occluders, {
          sunTime: options.sunTime,
          evening: options.evening,
        });

  return { floors, flats, faces, light };
}

/** Schmale Glasscheibe in der Wandmitte */
function glassQuad(wall: Wall, t0: number, t1: number): Point[] {
  const g = 0.025;
  return [along(wall, t0, -g), along(wall, t1, -g), along(wall, t1, g), along(wall, t0, g)];
}

/** Umriss eines Möbels auf dem Bildschirm (für die Karte) */
export function itemScreenBounds(
  item: Furniture,
  projection: Projection,
): { x0: number; y0: number; x1: number; y1: number } {
  const h = Math.max(0.01, item.height / 100);
  const corners = itemRect(item, 0, 0, item.w, item.d).flatMap(([x, y]) => [
    projection.project(x, y, 0),
    projection.project(x, y, h),
  ]);
  const xs = corners.map((p) => p[0]);
  const ys = corners.map((p) => p[1]);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}
