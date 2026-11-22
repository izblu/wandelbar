import type { Point2, Projection } from '../viewport.ts';
import type { Apartment, Point } from './apartment.ts';
import {
  exteriorWindows,
  roomAt,
  SUN_MIN_ELEVATION,
  SUN_THROUGH,
  sunDirection,
} from './geometry.ts';

/**
 * Licht im Platzhalter-Puppenhaus (D-032): Himmelslicht durch die Fenster, Sonne und Lampen.
 * Es liegt in zwei Ebenen über dem Modell, beide in Malreihenfolge: Jede Fläche deckt schwarz ab,
 * was vor ihr gemalt wurde. So verdecken Wände und Möbel das Licht dahinter wie im Modell.
 * - Tageslicht (Füllmodus „color-dodge“): Am Tag ist innen alles um `INDOOR_SHADE` dunkler. Das
 *   Himmelslicht der Fenster hebt die Farben zum Fenster hin wieder an, ohne sie auszubleichen.
 *   Was weit weg vom Fenster liegt oder ihm abgewandt ist, bleibt dunkler.
 * - Sonne und Lampen (Füllmodus „screen“): hellen auf, was sie treffen. Die Sonne fällt als
 *   Strahl durch die Fenster, Möbel im Strahl werfen Schatten.
 * Ersetzt durch das echte 3D in M3.
 */

export type Vec3 = [number, number, number];

/** Ebene einer Fläche in Weltkoordinaten (Meter): Außennormale (Länge 1) und ein Punkt darauf */
export interface Plane {
  normal: Vec3;
  point: Vec3;
}

/** Was die Lichtrechnung von einer Fläche des Modells braucht */
export interface LitSurface {
  key: string;
  points: Point2[];
  className: string;
  itemId?: string;
  /** Raum, dessen Licht diese Fläche trifft; null bei Wandkappen, Außenseiten und Glas */
  room: string | null;
  plane: Plane;
  /** Körper (Quader), zu dem die Fläche gehört: Er wirft keinen Schatten auf sich selbst */
  body: string;
  /** Leuchtet selbst (Lampenschirm am Abend) */
  glow?: boolean;
}

/** Möbelteil, das Sonnenlicht abhält */
export interface Occluder {
  key: string;
  room: string | null;
  footprint: readonly Point[];
  z0: number;
  z1: number;
}

/**
 * Licht einer Quelle auf einer Ebene: ein Kreis um den Fußpunkt der Quelle in der Ebene, auf dem
 * Bildschirm eine Ellipse. Die Parallelprojektion ist affin, deshalb bildet `matrix` den
 * Einheitskreis genau auf diese Ellipse ab (SVG `gradientTransform`).
 */
export interface LightSpot {
  id: string;
  /** Farbe: Lampe (warm) oder Himmelslicht */
  kind: 'lamp' | 'sky';
  matrix: readonly [number, number, number, number, number, number];
  /** Deckkraft des Lichts von der Mitte (`offset` 0) bis zum Rand (1) */
  stops: readonly { offset: number; opacity: number }[];
}

/** Fläche einer Lichtebene, in Malreihenfolge */
export interface LightFace {
  key: string;
  points: Point2[];
  /** Verdeckt Licht, das früher gemalt wurde (Glas nur teilweise) */
  block: 'none' | 'solid' | 'glass';
  /** Deckkraft des selbst leuchtenden Lampenschirms, 0 = aus */
  glow: number;
  /** Sonne: die Teile der Fläche im Strahl eines Fensters */
  sun: { patches: Point2[][]; opacity: number } | null;
  /** Schatten im Sonnenlicht; sie nehmen nur die Sonne weg, das übrige Licht kommt danach */
  shadows: Point2[][];
  /** Lichtflecken der Quellen, die diese Fläche treffen */
  spots: string[];
  /** Möbel der Fläche: Sein Auswahlrand bleibt frei von Licht */
  itemId?: string;
  /** Boden: Hier bekommt die Sonne weiche Kanten */
  floor?: boolean;
}

export interface SceneLight {
  spots: LightSpot[];
  /** Himmelslicht der Fenster (color-dodge) */
  daylight: LightFace[];
  /** Sonne und Lampen (screen) */
  glow: LightFace[];
}

/** Höhe des Lampenschirms; das Licht sitzt in seiner Mitte */
export const SHADE = 0.32;
/** So viel dunkler ist am Tag innen alles, wohin kein Tageslicht fällt */
export const INDOOR_SHADE = 0.3;

/* ------------------------------------------------------------------ Lampen */

/** Reichweite einer Lampe (Meter); am Rand ist ihr Licht ganz ausgeblendet */
const LAMP_REACH = 2.5;
/** Helligkeit des Lichts im Verhältnis zur Rechnung, und höchstens so deckend */
const LAMP_GAIN = 1.6;
const LAMP_MAX = 0.72;
/** Schräg getroffene Flächen: so viel Licht bleibt bei streifendem Einfall (Lambert gemildert) */
const LAMP_GRAZING = 0.35;
/**
 * Der Schirm lenkt das Licht nach unten und oben: zur Seite (auf Wände und Möbelseiten) kommt nur
 * dieser Teil, nach unten mehr, je steiler.
 */
const LAMP_SIDEWAYS = 0.5;

/* ------------------------------------------------------------------ Himmelslicht */

/**
 * Das Himmelslicht eines Fensters ist ein Punktlicht so weit draußen vor der Scheibe: Es fällt
 * schräg in den Raum, nimmt zur Tiefe hin ab und trifft die Fensterwand innen nicht.
 */
const SKY_BACK = 1;
const SKY_REACH = 6.5;
const SKY_GAIN = 0.65;
/** Höchste Aufhellung: Am Fenster erreicht alles knapp wieder seine eigentliche Farbe */
const SKY_MAX = 0.32;
const SKY_GRAZING = 0.3;
/** Fensterfläche (m²) mit voller Stärke; kleinere Fenster geben weniger Licht */
const SKY_AREA = 2.2;

/* ------------------------------------------------------------------ Sonne */

const SUN_GAIN = 1.05;
const SUN_MAX = 0.88;
const SUN_GRAZING = 0.35;
/** Ab dieser Sonnenhöhe (Grad) hat die Sonne ihre volle Stärke */
const SUN_FULL_ELEVATION = 9;

const STOPS = 7;
/** Schwächeres Licht (Anteil von Tag oder Abend) ist nicht mehr zu sehen und wird nicht gezeichnet */
const FAINT = 0.03;
/** Kleinere Stücke (Pixel²) werden nicht gezeichnet */
const MIN_AREA = 0.5;

interface Source {
  id: string;
  kind: LightSpot['kind'];
  room: string;
  position: Vec3;
  reach: number;
  /** Möbel, das sein eigenes Licht nicht abbekommt (die Lampe selbst) */
  itemId?: string;
  /** Helligkeit in der Entfernung `s` bei Abstand `h` der Ebene zur Quelle */
  brightness: (s: number, h: number, horizontal: boolean) => number;
}

interface Beam {
  room: string;
  /** Fensteröffnung an der Innenseite der Wand */
  corners: Vec3[];
}

interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

const dot3 = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const FLOOR_PLANE: Plane = { normal: [0, 0, 1], point: [0, 0, 0] };

function boxOf(points: readonly Point2[]): Box {
  const box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  for (const [x, y] of points) {
    box.x0 = Math.min(box.x0, x);
    box.y0 = Math.min(box.y0, y);
    box.x1 = Math.max(box.x1, x);
    box.y1 = Math.max(box.y1, y);
  }
  return box;
}

const overlaps = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

const intersect = (a: Box, b: Box): Box => ({
  x0: Math.max(a.x0, b.x0),
  y0: Math.max(a.y0, b.y0),
  x1: Math.min(a.x1, b.x1),
  y1: Math.min(a.y1, b.y1),
});

function signedArea(points: readonly Point2[]): number {
  let sum = 0;
  points.forEach((p, index) => {
    const q = points[(index + 1) % points.length] ?? p;
    sum += p[0] * q[1] - q[0] * p[1];
  });
  return sum / 2;
}

/** Schnitt eines beliebigen Vielecks mit einem konvexen (Sutherland-Hodgman) */
function clipConvex(subject: readonly Point2[], clip: readonly Point2[]): Point2[] {
  const orientation = Math.sign(signedArea(clip));
  if (orientation === 0) return [];
  let output: Point2[] = [...subject];
  clip.forEach((a, index) => {
    if (output.length === 0) return;
    const b = clip[(index + 1) % clip.length] ?? a;
    const side = (p: Point2) =>
      orientation * ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]));
    const input = output;
    output = [];
    input.forEach((p, j) => {
      const q = input[(j + 1) % input.length] ?? p;
      const sp = side(p);
      const sq = side(q);
      if (sp >= 0) output.push(p);
      if (sp >= 0 !== sq >= 0) {
        const t = sp / (sp - sq);
        output.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
      }
    });
  });
  return output;
}

const visible = (points: readonly Point2[]) =>
  points.length >= 3 && Math.abs(signedArea(points)) > MIN_AREA;

/** Konvexe Hülle (Andrew), gegen den Uhrzeigersinn */
function convexHull(points: readonly Point2[]): Point2[] {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (sorted.length < 3) return sorted;
  const cross = (o: Point2, a: Point2, b: Point2) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const chain = (list: readonly Point2[]) => {
    const result: Point2[] = [];
    for (const p of list) {
      for (;;) {
        const a = result[result.length - 2];
        const b = result[result.length - 1];
        if (!a || !b || cross(a, b, p) > 0) break;
        result.pop();
      }
      result.push(p);
    }
    result.pop();
    return result;
  };
  return [...chain(sorted), ...chain([...sorted].reverse())];
}

/** Helligkeit einer Lampe in der Entfernung `s` bei Abstand `h` der Fläche */
function lampBrightness(s: number, h: number, horizontal: boolean): number {
  const t = s / LAMP_REACH;
  if (t >= 1) return 0;
  const falloff = (1 - t * t) ** 2;
  const cos = h / s;
  const incidence = LAMP_GRAZING + (1 - LAMP_GRAZING) * cos;
  // Auf waagerechten Flächen unter der Lampe ist der Einfall steil, auf senkrechten seitlich
  const direction = horizontal ? LAMP_SIDEWAYS + (1 - LAMP_SIDEWAYS) * cos : LAMP_SIDEWAYS;
  return Math.min(LAMP_MAX, LAMP_GAIN * falloff * incidence * direction);
}

function skyBrightness(s: number, h: number, size: number): number {
  const t = s / SKY_REACH;
  if (t >= 1) return 0;
  const falloff = (1 - t * t) ** 2;
  const incidence = SKY_GRAZING + (1 - SKY_GRAZING) * (h / s);
  return Math.min(SKY_MAX, SKY_GAIN * size * falloff * incidence);
}

/**
 * Licht der Szene zur Uhrzeit `sunTime`. `floors` und `surfaces` in Malreihenfolge (Böden zuerst),
 * `occluders` sind die Möbelteile, die Schatten werfen.
 */
export function sceneLight(
  apartment: Apartment,
  projection: Projection,
  floors: readonly { roomId: string; points: Point2[] }[],
  surfaces: readonly LitSurface[],
  occluders: readonly Occluder[],
  options: { sunTime: number; evening: number },
): SceneLight {
  const { project } = projection;
  const { evening } = options;
  const origin = project(0, 0, 0);
  const linear = (v: Vec3): Point2 => {
    const p = project(v[0], v[1], v[2]);
    return [p[0] - origin[0], p[1] - origin[1]];
  };
  const projectVec = (v: Vec3): Point2 => project(v[0], v[1], v[2]);

  /* Quellen */
  const lamps: Source[] = [];
  if (evening > FAINT) {
    for (const item of apartment.furniture) {
      if (item.kind !== 'lamp') continue;
      const cx = item.x + item.w / 2;
      const cy = item.y + item.d / 2;
      const room = roomAt(apartment.rooms, [cx, cy])?.id;
      if (room === undefined) continue;
      lamps.push({
        id: item.id,
        kind: 'lamp',
        room,
        position: [cx, cy, item.height / 100 - SHADE / 2],
        reach: LAMP_REACH,
        itemId: item.id,
        brightness: (s, h, horizontal) => evening * lampBrightness(s, h, horizontal),
      });
    }
  }

  const windows = exteriorWindows(apartment);
  const sky: Source[] = [];
  const daylight = 1 - evening;
  if (daylight > FAINT) {
    for (const window of windows) {
      const { opening, outward, p0, p1, sill, lintel } = window;
      const size = Math.sqrt(
        Math.min(1.4, Math.max(0.25, (opening.width * opening.height) / SKY_AREA)),
      );
      sky.push({
        id: opening.id,
        kind: 'sky',
        room: opening.roomId,
        position: [
          (p0[0] + p1[0]) / 2 + outward[0] * SKY_BACK,
          (p0[1] + p1[1]) / 2 + outward[1] * SKY_BACK,
          (sill + lintel) / 2,
        ],
        reach: SKY_REACH,
        brightness: (s, h) => daylight * skyBrightness(s, h, size),
      });
    }
  }

  // Sonne: Richtung zur Sonne, Lichtrichtung `travel` und Strahlen durch die Fenster
  const { toSun: flatToSun, elevation } = sunDirection(options.sunTime, apartment.north);
  const strength = Math.max(
    0,
    Math.min(1, (elevation - SUN_MIN_ELEVATION) / (SUN_FULL_ELEVATION - SUN_MIN_ELEVATION)),
  );
  const rise = (elevation * Math.PI) / 180;
  const toSun: Vec3 = [
    flatToSun[0] * Math.cos(rise),
    flatToSun[1] * Math.cos(rise),
    Math.sin(rise),
  ];
  const travel: Vec3 = [-toSun[0], -toSun[1], -toSun[2]];
  const beams: Beam[] =
    strength > 0
      ? windows
          .filter(
            (window) =>
              flatToSun[0] * window.outward[0] + flatToSun[1] * window.outward[1] > SUN_THROUGH,
          )
          .map(({ opening, p0, p1, sill, lintel }) => ({
            room: opening.roomId,
            corners: [
              [p0[0], p0[1], sill],
              [p1[0], p1[1], sill],
              [p1[0], p1[1], lintel],
              [p0[0], p0[1], lintel],
            ],
          }))
      : [];

  /* Lichtflecken: einer je Quelle und Ebene; Wandstücke einer Wandseite teilen sich ihn */
  const spots = new Map<string, { spot: LightSpot; box: Box } | null>();
  const spotOn = (source: Source, plane: Plane) => {
    const { normal } = plane;
    const key = `${source.id}|${normal.map((v) => v.toFixed(3)).join(',')}|${dot3(normal, plane.point).toFixed(3)}`;
    const known = spots.get(key);
    if (known !== undefined) return known;
    const h = dot3(normal, [
      source.position[0] - plane.point[0],
      source.position[1] - plane.point[1],
      source.position[2] - plane.point[2],
    ]);
    let result: { spot: LightSpot; box: Box } | null = null;
    // Flächen hinter der Quelle und solche außer Reichweite bleiben dunkel
    if (h > 0.01 && h < source.reach) {
      const radius = Math.sqrt(source.reach ** 2 - h * h);
      const foot: Vec3 = [
        source.position[0] - normal[0] * h,
        source.position[1] - normal[1] * h,
        source.position[2] - normal[2] * h,
      ];
      const horizontal = normal[2] > 0.5;
      // Achsen in der Ebene: waagerecht x und y, senkrecht entlang der Wand und nach oben
      const u = linear(horizontal ? [1, 0, 0] : [-normal[1], normal[0], 0]);
      const v = linear(horizontal ? [0, 1, 0] : [0, 0, 1]);
      const center = projectVec(foot);
      const stops = Array.from({ length: STOPS }, (_, index) => {
        const offset = index / (STOPS - 1);
        return {
          offset,
          opacity: source.brightness(Math.hypot(h, offset * radius), h, horizontal),
        };
      });
      const halfWidth = Math.hypot(u[0], v[0]) * radius;
      const halfHeight = Math.hypot(u[1], v[1]) * radius;
      result = {
        spot: {
          id: String(spots.size),
          kind: source.kind,
          matrix: [
            u[0] * radius,
            u[1] * radius,
            v[0] * radius,
            v[1] * radius,
            center[0],
            center[1],
          ],
          stops,
        },
        box: {
          x0: center[0] - halfWidth,
          y0: center[1] - halfHeight,
          x1: center[0] + halfWidth,
          y1: center[1] + halfHeight,
        },
      };
    }
    spots.set(key, result);
    return result;
  };

  /** Schatten eines Möbelteils auf einer Ebene, auf dem Bildschirm; nur der Teil vor der Ebene */
  const shadowOf = (occluder: Occluder, plane: Plane): Point2[] | null => {
    const { normal, point } = plane;
    const approach = dot3(travel, normal);
    const distance = (v: Vec3) =>
      (v[0] - point[0]) * normal[0] + (v[1] - point[1]) * normal[1] + (v[2] - point[2]) * normal[2];
    const bottom = occluder.footprint.map(([x, y]): Vec3 => [x, y, occluder.z0]);
    const top = occluder.footprint.map(([x, y]): Vec3 => [x, y, occluder.z1]);
    const front: Vec3[] = [...bottom, ...top].filter((v) => distance(v) >= 0);
    if (front.length === 0) return null;
    // Kanten, die die Ebene durchstoßen, werden an ihr geschnitten
    bottom.forEach((b, index) => {
      const next = (index + 1) % bottom.length;
      const edges: [Vec3 | undefined, Vec3 | undefined][] = [
        [b, bottom[next]],
        [top[index], top[next]],
        [b, top[index]],
      ];
      for (const [a, c] of edges) {
        if (!a || !c) continue;
        const da = distance(a);
        const dc = distance(c);
        if ((da > 0 && dc < 0) || (da < 0 && dc > 0)) {
          const t = da / (da - dc);
          front.push([
            a[0] + (c[0] - a[0]) * t,
            a[1] + (c[1] - a[1]) * t,
            a[2] + (c[2] - a[2]) * t,
          ]);
        }
      }
    });
    const flat = front.map((v) => {
      const t = -distance(v) / approach;
      return project(v[0] + travel[0] * t, v[1] + travel[1] * t, v[2] + travel[2] * t);
    });
    const hull = convexHull(flat);
    return hull.length >= 3 ? hull : null;
  };

  /** Sonne auf einer Fläche: die Teile im Strahl, die Deckkraft nach dem Einfall, die Schatten */
  const sunOn = (surface: Surface) => {
    if (beams.length === 0 || surface.room === null) return null;
    const { normal, point } = surface.plane;
    const facing = dot3(normal, toSun);
    if (facing <= 0.02) return null;
    const approach = -facing;
    const patches: Point2[][] = [];
    for (const beam of beams) {
      if (beam.room !== surface.room) continue;
      const quad = beam.corners.map((corner) => {
        const t =
          ((point[0] - corner[0]) * normal[0] +
            (point[1] - corner[1]) * normal[1] +
            (point[2] - corner[2]) * normal[2]) /
          approach;
        return project(
          corner[0] + travel[0] * t,
          corner[1] + travel[1] * t,
          corner[2] + travel[2] * t,
        );
      });
      const patch = clipConvex(surface.points, quad);
      if (visible(patch)) patches.push(patch);
    }
    if (patches.length === 0) return null;
    const shadows: Point2[][] = [];
    for (const occluder of occluders) {
      if (occluder.room !== surface.room || occluder.key === surface.body) continue;
      const hull = shadowOf(occluder, surface.plane);
      if (!hull || !patches.some((patch) => visible(clipConvex(patch, hull)))) continue;
      const shadow = clipConvex(surface.points, hull);
      if (visible(shadow)) shadows.push(shadow);
    }
    const opacity = Math.min(
      SUN_MAX,
      SUN_GAIN * strength * (SUN_GRAZING + (1 - SUN_GRAZING) * facing),
    );
    return { patches, opacity, shadows };
  };

  const spotsOn = (sources: readonly Source[], surface: Surface) =>
    sources
      .filter((source) => source.room === surface.room && source.itemId !== surface.itemId)
      .map((source) => spotOn(source, surface.plane))
      .filter((hit) => hit !== null);

  const floorSurfaces: Surface[] = floors.map((floor) => ({
    key: `${floor.roomId}-floor`,
    points: floor.points,
    room: floor.roomId,
    plane: FLOOR_PLANE,
  }));

  const daylightLayer =
    sky.length > 0
      ? layer(floorSurfaces, surfaces, 'solid', 0, (surface) => {
          const hits = spotsOn(sky, surface);
          if (hits.length === 0) return null;
          const box = boxOf(surface.points);
          return {
            light: { sun: null, shadows: [], spots: hits.map((hit) => hit.spot.id) },
            boxes: hits.map((hit) => intersect(box, hit.box)),
          };
        })
      : [];

  const glowLayer =
    lamps.length > 0 || beams.length > 0
      ? layer(floorSurfaces, surfaces, 'none', evening, (surface) => {
          const hits = spotsOn(lamps, surface);
          const sun = sunOn(surface);
          if (hits.length === 0 && !sun) return null;
          const box = boxOf(surface.points);
          return {
            light: {
              sun: sun && { patches: sun.patches, opacity: sun.opacity },
              shadows: sun?.shadows ?? [],
              spots: hits.map((hit) => hit.spot.id),
            },
            boxes: [
              ...hits.map((hit) => intersect(box, hit.box)),
              ...(sun?.patches.map(boxOf) ?? []),
            ],
          };
        })
      : [];

  const list = [...spots.values()].flatMap((entry) => (entry ? [entry.spot] : []));
  return { spots: list, daylight: daylightLayer, glow: glowLayer };
}

interface Surface {
  key: string;
  points: Point2[];
  room: string | null;
  plane: Plane;
  itemId?: string;
  body?: string;
}

/**
 * Eine Lichtebene in Malreihenfolge: erst die Böden, dann alle Flächen. Beleuchtete Flächen
 * decken ab, was hinter ihnen liegt, und tragen ihr Licht; unbeleuchtete decken nur ab, wenn sie
 * schon gemaltes Licht überlagern. Selbst leuchtende Flächen (Lampenschirme) leuchten mit `glow`.
 */
function layer(
  floors: readonly Surface[],
  surfaces: readonly LitSurface[],
  floorBlock: LightFace['block'],
  glow: number,
  lightOn: (
    surface: Surface,
  ) => { light: Pick<LightFace, 'sun' | 'shadows' | 'spots'>; boxes: Box[] } | null,
): LightFace[] {
  const faces: LightFace[] = [];
  /** Was bisher Licht trägt: Nur Flächen darüber müssen es verdecken */
  const litBoxes: Box[] = [];
  const dark = { sun: null, shadows: [], spots: [] };

  for (const floor of floors) {
    const lit = lightOn(floor);
    if (!lit) continue;
    faces.push({
      key: floor.key,
      points: floor.points,
      block: floorBlock,
      glow: 0,
      floor: true,
      ...lit.light,
    });
    litBoxes.push(...lit.boxes);
  }
  for (const surface of surfaces) {
    const { key, points, itemId } = surface;
    const glass = surface.className.startsWith('app-dh-glass');
    if (surface.glow && glow > 0) {
      faces.push({ key, points, itemId, block: 'solid', glow, ...dark });
      litBoxes.push(boxOf(points));
      continue;
    }
    const lit = glass ? null : lightOn(surface);
    if (lit) {
      faces.push({ key, points, itemId, block: 'solid', glow: 0, ...lit.light });
      litBoxes.push(...lit.boxes);
      continue;
    }
    const box = boxOf(points);
    if (litBoxes.some((boxLit) => overlaps(boxLit, box))) {
      faces.push({ key, points, itemId, block: glass ? 'glass' : 'solid', glow: 0, ...dark });
    }
  }
  return faces;
}
