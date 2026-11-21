import { sunPosition } from '../../model/sun.ts';
import type { Apartment, Furniture, Opening, Point, Room, Wall } from './apartment.ts';

/**
 * Geometrie des Prototyps als reine Funktionen: Wandstücke zwischen Öffnungen, Flächen,
 * Sonnenflecken nach Uhrzeit und Nordrichtung. Das echte Wand-Modell (Gehrungen, Bereiche) folgt
 * in M2 und M3; die Schnittstellen hier sind bewusst schlicht.
 */

export interface Bounds {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

const add = (p: Point, q: Point): Point => [p[0] + q[0], p[1] + q[1]];
const scale = (p: Point, factor: number): Point => [p[0] * factor, p[1] * factor];
const dot = (p: Point, q: Point): number => p[0] * q[0] + p[1] * q[1];

/** Fläche eines einfachen Vielecks (Gaußsche Trapezformel), immer positiv */
export function polygonArea(points: readonly Point[]): number {
  let sum = 0;
  points.forEach((p, index) => {
    const q = points[(index + 1) % points.length] ?? p;
    sum += p[0] * q[1] - q[0] * p[1];
  });
  return Math.abs(sum) / 2;
}

export function totalArea(rooms: readonly Room[]): number {
  return rooms.reduce((sum, room) => sum + polygonArea(room.polygon), 0);
}

/** Liegt der Punkt im Vieleck? (Strahlverfahren) */
export function pointInPolygon(point: Point, polygon: readonly Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    if (!a || !b) continue;
    const crosses =
      a[1] > point[1] !== b[1] > point[1] &&
      point[0] < ((b[0] - a[0]) * (point[1] - a[1])) / (b[1] - a[1]) + a[0];
    if (crosses) inside = !inside;
  }
  return inside;
}

export function roomAt(rooms: readonly Room[], point: Point): Room | null {
  return rooms.find((room) => pointInPolygon(point, room.polygon)) ?? null;
}

/* ------------------------------------------------------------------ Wände und Öffnungen */

export interface WallFrame {
  /** Einheitsvektor von a nach b */
  dir: Point;
  /** Senkrecht dazu, um 90° im Uhrzeigersinn des Bildschirms gedreht */
  normal: Point;
  length: number;
}

export function wallFrame(wall: Wall): WallFrame {
  const dx = wall.b[0] - wall.a[0];
  const dy = wall.b[1] - wall.a[1];
  const length = Math.hypot(dx, dy) || 1;
  const dir: Point = [dx / length, dy / length];
  return { dir, normal: [-dir[1], dir[0]], length };
}

/** Punkt auf der Mittellinie, `t` Meter hinter a */
export function along(wall: Wall, t: number, side = 0): Point {
  const { dir, normal } = wallFrame(wall);
  return add(add(wall.a, scale(dir, t)), scale(normal, side));
}

/** Rechteck um ein Stück der Mittellinie (von t0 bis t1) */
export function wallQuad(wall: Wall, t0: number, t1: number): Point[] {
  const h = wall.thickness / 2;
  return [along(wall, t0, -h), along(wall, t1, -h), along(wall, t1, h), along(wall, t0, h)];
}

export interface WallPiece {
  t0: number;
  t1: number;
  /** Kante an einer Öffnung (dort keine Stirnfläche im Puppenhaus) */
  openStart: boolean;
  openEnd: boolean;
}

/**
 * Die festen Stücke einer Wand zwischen ihren Öffnungen. An den echten Enden ragt die Wand um die
 * halbe Dicke hinaus, damit Ecken und Stöße geschlossen sind.
 */
export function wallPieces(wall: Wall, openings: readonly Opening[]): WallPiece[] {
  const { length } = wallFrame(wall);
  const h = wall.thickness / 2;
  const own = openings
    .filter((opening) => opening.wallId === wall.id)
    .sort((a, b) => a.offset - b.offset);
  const pieces: WallPiece[] = [];
  let cursor = -h;
  let openStart = false;
  for (const opening of own) {
    const start = Math.max(cursor, opening.offset);
    if (start - cursor > 0.001) pieces.push({ t0: cursor, t1: start, openStart, openEnd: true });
    cursor = Math.max(cursor, opening.offset + opening.width);
    openStart = true;
  }
  if (length + h - cursor > 0.001) {
    pieces.push({ t0: cursor, t1: length + h, openStart, openEnd: false });
  }
  return pieces;
}

export function openingQuad(wall: Wall, opening: Opening): Point[] {
  return wallQuad(wall, opening.offset, opening.offset + opening.width);
}

/** Seite der Wand (+1 oder −1 entlang der Normalen), auf der der Raum liegt */
export function roomSide(wall: Wall, room: Room | undefined): 1 | -1 {
  if (!room) return 1;
  const { normal } = wallFrame(wall);
  const toRoom: Point = [room.label[0] - wall.a[0], room.label[1] - wall.a[1]];
  return dot(toRoom, normal) >= 0 ? 1 : -1;
}

/** Türblatt und Schwenkbogen im Grundriss, als SVG-Pfad */
export function doorSwingPath(wall: Wall, opening: Opening, room: Room | undefined): string {
  const side = roomSide(wall, room);
  const h = (wall.thickness / 2) * side;
  const hingeAtStart = opening.hinge !== 'end';
  const hingeT = hingeAtStart ? opening.offset : opening.offset + opening.width;
  const freeT = hingeAtStart ? opening.offset + opening.width : opening.offset;
  const hinge = along(wall, hingeT, h);
  const free = along(wall, freeT, h);
  const { normal } = wallFrame(wall);
  const leafEnd = add(hinge, scale(normal, opening.width * side));
  // Bogen vom offenen Blatt zur geschlossenen Lage
  const cross =
    (free[0] - hinge[0]) * (leafEnd[1] - hinge[1]) - (free[1] - hinge[1]) * (leafEnd[0] - hinge[0]);
  const sweep = cross > 0 ? 0 : 1;
  const r = opening.width;
  const f = (p: Point) => `${p[0].toFixed(3)},${p[1].toFixed(3)}`;
  return `M${f(hinge)} L${f(leafEnd)} A${r.toFixed(3)},${r.toFixed(3)} 0 0 ${String(sweep)} ${f(free)}`;
}

export function wallLength(wall: Wall): number {
  return wallFrame(wall).length;
}

/** Äußere Grenzen des Baus samt Wänden */
export function apartmentBounds(apartment: Pick<Apartment, 'walls'>): Bounds {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const wall of apartment.walls) {
    for (const corner of wallQuad(
      wall,
      -wall.thickness / 2,
      wallLength(wall) + wall.thickness / 2,
    )) {
      xs.push(corner[0]);
      ys.push(corner[1]);
    }
  }
  if (xs.length === 0) return { x0: 0, y0: 0, x1: 1, y1: 1 };
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}

/**
 * Alle Maße mit einem Faktor strecken, z. B. nach dem Nachmessen einer Strecke. `scale` hält den
 * Faktor gegenüber der Erkennung fest, damit ein erneutes Nachmessen von der jetzigen Länge ausgeht.
 */
export function rescaleApartment(apartment: Apartment, factor: number): Apartment {
  if (factor === 1) return apartment;
  const p = (point: Point): Point => [point[0] * factor, point[1] * factor];
  return {
    ...apartment,
    scale: apartment.scale * factor,
    walls: apartment.walls.map((wall) => ({ ...wall, a: p(wall.a), b: p(wall.b) })),
    openings: apartment.openings.map((opening) => ({
      ...opening,
      offset: opening.offset * factor,
      width: opening.width * factor,
    })),
    rooms: apartment.rooms.map((room) => ({
      ...room,
      polygon: room.polygon.map(p),
      label: p(room.label),
    })),
    furniture: apartment.furniture.map((item) => ({
      ...item,
      x: item.x * factor + (item.w * (factor - 1)) / 2,
      y: item.y * factor + (item.d * (factor - 1)) / 2,
    })),
  };
}

/* ------------------------------------------------------------------ Möbel */

/** Größe auf dem Boden nach Drehung */
export function footprint(item: Furniture): Bounds {
  const turned = item.rotation === 90 || item.rotation === 270;
  const w = turned ? item.d : item.w;
  const d = turned ? item.w : item.d;
  const cx = item.x + item.w / 2;
  const cy = item.y + item.d / 2;
  return { x0: cx - w / 2, y0: cy - d / 2, x1: cx + w / 2, y1: cy + d / 2 };
}

export function furnitureCenter(item: Furniture): Point {
  return [item.x + item.w / 2, item.y + item.d / 2];
}

/* ------------------------------------------------------------------ Sonne */

export interface SunPatch {
  roomId: string;
  polygon: Point[];
}

/** Richtung zur Sonne im Plan (x Osten des Plans, y Süden), mit Nordrichtung des Plans */
export function sunDirection(hours: number, north: number): { toSun: Point; elevation: number } {
  const { azimuth, elevation } = sunPosition(hours);
  const angle = ((azimuth + north) * Math.PI) / 180;
  return { toSun: [Math.sin(angle), -Math.cos(angle)], elevation };
}

/** Unter dieser Sonnenhöhe (Grad) fällt keine Sonne mehr in die Wohnung */
export const SUN_MIN_ELEVATION = 3;
/** Streifendes Licht schirmt die Laibung ab: So weit muss die Sonne vor dem Fenster stehen */
export const SUN_THROUGH = 0.2;

/** Fenster einer Außenwand: die Öffnung an der Innenseite der Wand */
export interface WindowAperture {
  opening: Opening;
  /** Waagerechte Normale der Wand nach außen */
  outward: Point;
  /** Anfang und Ende der Öffnung an der Innenseite der Wand */
  p0: Point;
  p1: Point;
  sill: number;
  lintel: number;
}

export function exteriorWindows(
  apartment: Pick<Apartment, 'walls' | 'openings' | 'rooms'>,
): WindowAperture[] {
  const windows: WindowAperture[] = [];
  for (const opening of apartment.openings) {
    if (opening.kind !== 'window') continue;
    const wall = apartment.walls.find((candidate) => candidate.id === opening.wallId);
    if (!wall?.exterior) continue;
    const room = apartment.rooms.find((candidate) => candidate.id === opening.roomId);
    const side = roomSide(wall, room);
    const { normal } = wallFrame(wall);
    const inner = (wall.thickness / 2) * side;
    windows.push({
      opening,
      outward: scale(normal, -side),
      p0: along(wall, opening.offset, inner),
      p1: along(wall, opening.offset + opening.width, inner),
      sill: opening.sill,
      lintel: opening.sill + opening.height,
    });
  }
  return windows;
}

/**
 * Sonnenflecken auf dem Boden: Jede Scheibe (Brüstung bis Sturz) eines Außenfensters wird in
 * Richtung des Lichts auf den Boden projiziert. Das Abschneiden am Raum übernimmt die Zeichnung.
 */
export function sunPatches(
  apartment: Pick<Apartment, 'walls' | 'openings' | 'rooms' | 'north'>,
  hours: number,
): SunPatch[] {
  const { toSun, elevation } = sunDirection(hours, apartment.north);
  if (elevation < SUN_MIN_ELEVATION) return [];
  const reach = 1 / Math.tan((elevation * Math.PI) / 180);
  const shift = (p: Point, height: number): Point => [
    p[0] - toSun[0] * height * reach,
    p[1] - toSun[1] * height * reach,
  ];
  return exteriorWindows(apartment)
    .filter((window) => dot(toSun, window.outward) > SUN_THROUGH)
    .map(({ opening, p0, p1, sill, lintel }) => ({
      roomId: opening.roomId,
      polygon: [shift(p0, sill), shift(p1, sill), shift(p1, lintel), shift(p0, lintel)],
    }));
}

/** Wie dunkel der Abend über der Wohnung liegt: 0 am Tag, bis 1 in der Nacht. */
export function eveningAmount(hours: number): number {
  const { elevation } = sunPosition(hours);
  return Math.max(0, Math.min(1, (8 - elevation) / 12));
}
