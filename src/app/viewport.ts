import type { StageLayout } from '../ui/stage/stageContext.ts';
import type { Bounds } from './prototype/geometry.ts';

/**
 * Kamera der Bühne als reine Rechnung: stufenloser Zoom (25 bis 800 % der eingepassten Größe),
 * Zoom zum Zeiger hin und Verschieben. Gilt für die Draufsicht und, mit Neigung und Drehung,
 * für das Puppenhaus.
 */

export type Point2 = readonly [number, number];

export const ZOOM_MIN = 0.25;
export const ZOOM_MAX = 8;
/** Ein Klick auf Plus oder Minus */
export const ZOOM_STEP = 1.25;

export interface Viewport {
  /** 1 = die ganze Wohnung passt auf die Bühne */
  zoom: number;
  /** Weltpunkt (Meter) in der Mitte der freien Fläche */
  center: Point2;
}

export interface Area {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Bildschirm = Welt · scale + Versatz */
export interface ViewFrame {
  scale: number;
  ox: number;
  oy: number;
}

export function clampZoom(zoom: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom));
}

/** Platz der Seitenleiste im Schritt Grundriss: am PC rechts, auf dem Handy unten */
export const PANEL_WIDTH = 420;
export const PANEL_HEIGHT_COMPACT = 380;
/** Platz für den Hinweis der Erkennung oben (Schritt Bauen) */
export const BANNER_SPACE = { wide: 48, compact: 64 } as const;

export interface SceneAreaOptions {
  /** Seitenleiste im Schritt Grundriss */
  panel?: boolean;
  /** Hinweis der Erkennung oben im Schritt Bauen */
  banner?: boolean;
}

/**
 * Freie Fläche für die Szene: am PC rechts der Werkzeugpalette, auf dem Handy zwischen den
 * Leisten. Mit `panel` bleibt Platz für die Seitenleiste, mit `banner` für den Hinweis oben.
 */
export function sceneArea(
  width: number,
  height: number,
  layout: StageLayout,
  { panel = false, banner = false }: SceneAreaOptions = {},
): Area {
  const top = banner ? BANNER_SPACE[layout] : 0;
  const area =
    layout === 'compact'
      ? {
          x0: 12,
          // Im Schritt Grundriss gibt es auf dem Handy keine Ansichtsleiste oben
          y0: (panel ? 76 : 128) + top,
          x1: width - 12,
          y1: height - (panel ? PANEL_HEIGHT_COMPACT : 262),
        }
      : {
          x0: panel ? 40 : 104,
          y0: 92 + top,
          x1: width - (panel ? PANEL_WIDTH : 40),
          y1: height - 92,
        };
  return {
    ...area,
    x1: Math.max(area.x0 + 120, area.x1),
    y1: Math.max(area.y0 + 120, area.y1),
  };
}

export function boundsCenter(bounds: Bounds): Point2 {
  return [(bounds.x0 + bounds.x1) / 2, (bounds.y0 + bounds.y1) / 2];
}

/** Maßstab, bei dem die Grenzen mit etwas Luft in die Fläche passen */
export function fitScale(bounds: Bounds, area: Area, margin = 0.06): number {
  const width = Math.max(0.1, bounds.x1 - bounds.x0);
  const height = Math.max(0.1, bounds.y1 - bounds.y0);
  const factor = 1 - 2 * margin;
  return Math.min(((area.x1 - area.x0) * factor) / width, ((area.y1 - area.y0) * factor) / height);
}

export function fittedViewport(bounds: Bounds): Viewport {
  return { zoom: 1, center: boundsCenter(bounds) };
}

/** Draufsicht: aus Kamera und Fläche wird der Rahmen für die Zeichnung */
export function planFrame(viewport: Viewport, bounds: Bounds, area: Area): ViewFrame {
  const scale = fitScale(bounds, area) * viewport.zoom;
  const cx = (area.x0 + area.x1) / 2;
  const cy = (area.y0 + area.y1) / 2;
  return { scale, ox: cx - viewport.center[0] * scale, oy: cy - viewport.center[1] * scale };
}

/** Zoomt um einen Faktor; der Weltpunkt unter `anchor` (Bildschirm) bleibt stehen. */
export function zoomPlanAt(
  viewport: Viewport,
  bounds: Bounds,
  area: Area,
  factor: number,
  anchor: Point2,
): Viewport {
  const zoom = clampZoom(viewport.zoom * factor);
  if (zoom === viewport.zoom) return viewport;
  const before = planFrame(viewport, bounds, area);
  const world: Point2 = [
    (anchor[0] - before.ox) / before.scale,
    (anchor[1] - before.oy) / before.scale,
  ];
  const scale = before.scale * (zoom / viewport.zoom);
  const cx = (area.x0 + area.x1) / 2;
  const cy = (area.y0 + area.y1) / 2;
  // Neuer Versatz so, dass `world` unter `anchor` bleibt; daraus die neue Mitte
  const ox = anchor[0] - world[0] * scale;
  const oy = anchor[1] - world[1] * scale;
  return { zoom, center: [(cx - ox) / scale, (cy - oy) / scale] };
}

/** Verschiebt die Ansicht um Bildschirmpixel */
export function panPlan(viewport: Viewport, frame: ViewFrame, dx: number, dy: number): Viewport {
  return {
    ...viewport,
    center: [viewport.center[0] - dx / frame.scale, viewport.center[1] - dy / frame.scale],
  };
}

export function areaCenter(area: Area): Point2 {
  return [(area.x0 + area.x1) / 2, (area.y0 + area.y1) / 2];
}

/* ------------------------------------------------------------------ Puppenhaus */

export interface Orbit {
  /** Drehung um die senkrechte Achse in Grad */
  yaw: number;
  /** Neigung in Grad: 0 = von oben, 90 = von vorn */
  tilt: number;
}

export const TILT_MIN = 18;
export const TILT_MAX = 72;

export function clampTilt(tilt: number): number {
  return Math.min(TILT_MAX, Math.max(TILT_MIN, tilt));
}

export interface Projection {
  project: (x: number, y: number, z: number) => Point2;
  /** Wie nah ein Punkt dem Betrachter ist (größer = näher) */
  depth: (x: number, y: number, z: number) => number;
  /** Bildschirm → Boden (z = 0) */
  unproject: (sx: number, sy: number) => Point2;
  /** Verschiebung auf dem Bildschirm → Verschiebung auf dem Boden */
  unprojectDelta: (dx: number, dy: number) => Point2;
  /** Richtung in der gedrehten Ansicht: positives y zeigt zum Betrachter */
  rotate: (x: number, y: number) => Point2;
  scale: number;
}

/**
 * Schräge Parallelprojektion für das Platzhalter-Puppenhaus: drehen um die Mitte, dann neigen.
 * Kein echtes 3D, aber ehrlich genug, um Ablauf und Licht zu zeigen.
 */
export function dollhouseProjection(
  viewport: Viewport,
  orbit: Orbit,
  bounds: Bounds,
  area: Area,
  wallTop: number,
): Projection {
  const yaw = (orbit.yaw * Math.PI) / 180;
  const tilt = (orbit.tilt * Math.PI) / 180;
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  const cosT = Math.cos(tilt);
  const sinT = Math.sin(tilt);
  const diagonal = Math.hypot(bounds.x1 - bounds.x0, bounds.y1 - bounds.y0);
  const base = Math.min(
    ((area.x1 - area.x0) * 0.92) / diagonal,
    ((area.y1 - area.y0) * 0.92) / (diagonal * cosT + wallTop * sinT),
  );
  const scale = base * viewport.zoom;
  const [acx, acy] = areaCenter(area);
  const [cx, cy] = viewport.center;

  const rotate = (x: number, y: number): Point2 => {
    const dx = x - cx;
    const dy = y - cy;
    return [dx * cos - dy * sin, dx * sin + dy * cos];
  };
  const unrotate = (rx: number, ry: number): Point2 => [rx * cos + ry * sin, -rx * sin + ry * cos];

  return {
    scale,
    rotate,
    project: (x, y, z) => {
      const [rx, ry] = rotate(x, y);
      return [acx + rx * scale, acy + ry * scale * cosT - z * scale * sinT];
    },
    depth: (x, y, z) => {
      const ry = rotate(x, y)[1];
      return ry * sinT + z * cosT;
    },
    unproject: (sx, sy) => {
      const [dx, dy] = unrotate((sx - acx) / scale, (sy - acy) / (scale * cosT));
      return [cx + dx, cy + dy];
    },
    unprojectDelta: (dx, dy) => unrotate(dx / scale, dy / (scale * cosT)),
  };
}

/**
 * Richtung auf dem Bildschirm → gleich lange Verschiebung auf dem Boden. So schiebt Pfeil rechts
 * ein Möbel im Puppenhaus immer nach rechts im Bild, wie auch die Ansicht gedreht ist (D-031).
 */
export function screenStepOnFloor(projection: Projection, dx: number, dy: number): Point2 {
  const [wx, wy] = projection.unprojectDelta(dx, dy);
  const floor = Math.hypot(wx, wy);
  if (floor === 0) return [0, 0];
  const length = Math.hypot(dx, dy);
  return [(wx / floor) * length, (wy / floor) * length];
}

/** Puppenhaus: Zoom zum Zeiger hin (gemessen auf dem Boden) */
export function zoomDollhouseAt(
  viewport: Viewport,
  projection: Projection,
  factor: number,
  anchor: Point2,
): Viewport {
  const zoom = clampZoom(viewport.zoom * factor);
  if (zoom === viewport.zoom) return viewport;
  const ratio = viewport.zoom / zoom;
  const world = projection.unproject(anchor[0], anchor[1]);
  // Der Bodenpunkt unter dem Zeiger bleibt stehen: die Mitte rückt anteilig auf ihn zu
  return {
    zoom,
    center: [
      world[0] + (viewport.center[0] - world[0]) * ratio,
      world[1] + (viewport.center[1] - world[1]) * ratio,
    ],
  };
}

export function panDollhouse(
  viewport: Viewport,
  projection: Projection,
  dx: number,
  dy: number,
): Viewport {
  const [wx, wy] = projection.unprojectDelta(dx, dy);
  return { ...viewport, center: [viewport.center[0] - wx, viewport.center[1] - wy] };
}

/**
 * Puppenhaus drehen und neigen um einen Bodenpunkt, der dabei auf dem Bildschirm stehen bleibt.
 * Liefert die Kamera mit neuer Mitte; der Zoom bleibt.
 */
export function orbitDollhouseAround(
  viewport: Viewport,
  from: Orbit,
  to: Orbit,
  pivot: Point2,
  bounds: Bounds,
  area: Area,
  wallTop: number,
): Viewport {
  const before = dollhouseProjection(viewport, from, bounds, area, wallTop);
  const [sx, sy] = before.project(pivot[0], pivot[1], 0);
  // Mit der Mitte im Ursprung liefert `unproject` den Abstand von der Mitte zum Bodenpunkt
  const after = dollhouseProjection(
    { zoom: viewport.zoom, center: [0, 0] },
    to,
    bounds,
    area,
    wallTop,
  );
  const [ox, oy] = after.unproject(sx, sy);
  return { zoom: viewport.zoom, center: [pivot[0] - ox, pivot[1] - oy] };
}

/**
 * Drehpunkt des Puppenhauses: die Mitte des sichtbaren Teils der Wohnung (gemessen auf dem Boden,
 * innerhalb der freien Fläche). Im Überblick ist das die Mitte der Wohnung, herangezoomt der Teil
 * vor dem Betrachter. Ist nichts von ihr zu sehen, der Punkt der Wohnung nächst der Bildmitte.
 */
export function visibleCenter(projection: Projection, bounds: Bounds, area: Area): Point2 {
  const inView: Point2[] = [
    projection.unproject(area.x0, area.y0),
    projection.unproject(area.x1, area.y0),
    projection.unproject(area.x1, area.y1),
    projection.unproject(area.x0, area.y1),
  ];
  return (
    polygonCentroid(clipToBounds(inView, bounds)) ??
    clampToBounds(projection.unproject(...areaCenter(area)), bounds)
  );
}

/**
 * Die Bildmitte bleibt über der Wohnung, damit sie beim Verschieben nie ganz verloren geht.
 * Strenge Fassung ohne Vorgeschichte; das Puppenhaus nutzt `keepNearApartment`.
 */
export function keepOverApartment(viewport: Viewport, bounds: Bounds): Viewport {
  const center = clampToBounds(viewport.center, bounds);
  return center[0] === viewport.center[0] && center[1] === viewport.center[1]
    ? viewport
    : { ...viewport, center };
}

/** Abstand eines Punkts von den Grenzen in Metern; innen und auf dem Rand 0 */
export function distanceToBounds(point: Point2, bounds: Bounds): number {
  const [x, y] = clampToBounds(point, bounds);
  return Math.hypot(point[0] - x, point[1] - y);
}

/**
 * Sperre für Verschieben und Zoomen im Puppenhaus (D-031): Die Bildmitte entfernt sich nie weiter
 * von der Wohnung als in `previous`. Gemessen wird im Maß des Bildschirms, also Abstand auf dem
 * Boden mal Zoom; so rückt die Wohnung auch beim Heranzoomen nicht aus dem Bild.
 *
 * Lag die Mitte über der Wohnung, gleitet sie wie bei `keepOverApartment` an der Kante entlang.
 * Lag sie daneben (nach einer Drehung, die keine Sperre hat), ist alles erlaubt, was sie nicht
 * weiter wegbringt; sonst rückt sie auf den nächsten erlaubten Punkt. Die Ansicht springt also
 * nie zur Wohnung zurück. Drehen und Neigen laufen ohne diese Sperre, damit der Drehpunkt genau
 * stehen bleibt.
 */
export function keepNearApartment(next: Viewport, previous: Viewport, bounds: Bounds): Viewport {
  // Erlaubter Abstand auf dem Boden: der bisherige, umgerechnet auf den neuen Zoom
  const reach = (distanceToBounds(previous.center, bounds) * previous.zoom) / next.zoom;
  const nearest = clampToBounds(next.center, bounds);
  const dx = next.center[0] - nearest[0];
  const dy = next.center[1] - nearest[1];
  const distance = Math.hypot(dx, dy);
  // Kleine Toleranz, damit Rechenungenauigkeit beim Gleiten keine neue Kamera erzeugt
  if (distance <= reach + 1e-9) return next;
  // Nächster Punkt der um `reach` erweiterten Grenzen (Rechteck mit gerundeten Ecken)
  const t = reach / distance;
  return { ...next, center: [nearest[0] + dx * t, nearest[1] + dy * t] };
}

export function clampToBounds(point: Point2, bounds: Bounds): Point2 {
  return [
    Math.min(bounds.x1, Math.max(bounds.x0, point[0])),
    Math.min(bounds.y1, Math.max(bounds.y0, point[1])),
  ];
}

/** Schneidet ein Vieleck mit einem achsparallelen Rechteck (Sutherland-Hodgman). */
export function clipToBounds(polygon: readonly Point2[], bounds: Bounds): Point2[] {
  const sides: ((point: Point2) => number)[] = [
    (point) => point[0] - bounds.x0,
    (point) => bounds.x1 - point[0],
    (point) => point[1] - bounds.y0,
    (point) => bounds.y1 - point[1],
  ];
  let result: Point2[] = [...polygon];
  for (const inside of sides) {
    const input = result;
    result = [];
    input.forEach((current, index) => {
      const previous = input[(index + input.length - 1) % input.length] ?? current;
      const a = inside(previous);
      const b = inside(current);
      const cut = (): Point2 => {
        const t = a / (a - b);
        return [
          previous[0] + (current[0] - previous[0]) * t,
          previous[1] + (current[1] - previous[1]) * t,
        ];
      };
      if (b >= 0) {
        if (a < 0) result.push(cut());
        result.push(current);
      } else if (a >= 0) {
        result.push(cut());
      }
    });
    if (result.length === 0) break;
  }
  return result;
}

/** Schwerpunkt eines Vielecks; null, wenn es keine Fläche hat */
export function polygonCentroid(polygon: readonly Point2[]): Point2 | null {
  let twiceArea = 0;
  let cx = 0;
  let cy = 0;
  polygon.forEach((p, index) => {
    const q = polygon[(index + 1) % polygon.length] ?? p;
    const cross = p[0] * q[1] - q[0] * p[1];
    twiceArea += cross;
    cx += (p[0] + q[0]) * cross;
    cy += (p[1] + q[1]) * cross;
  });
  if (Math.abs(twiceArea) < 1e-9) return null;
  return [cx / (3 * twiceArea), cy / (3 * twiceArea)];
}
