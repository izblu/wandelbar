import { sunPosition } from '../../model/sun.ts';

/**
 * Beispielraum der Übersichtsseite: ein Wohnzimmer von oben, Norden oben.
 * Maße in Metern; x wächst nach Osten, y nach Süden. Nur für die Vorführung der Bausteine,
 * das echte Datenmodell folgt mit dem Prototyp.
 */

export const ROOM = { width: 6, depth: 4.4, wall: 0.14 } as const;

export type Point = readonly [number, number];
export type FurnitureKind = 'sofa' | 'table' | 'armchair' | 'lamp' | 'shelf' | 'plant' | 'rug';

export interface Furniture {
  id: string;
  kind: FurnitureKind;
  name: string;
  /** Linke obere Ecke, ungedreht */
  x: number;
  y: number;
  /** Breite und Tiefe in Metern, Höhe in Zentimetern */
  w: number;
  d: number;
  height: number;
  rotation: 0 | 90 | 180 | 270;
  material: string;
  price: number;
  onList: boolean;
  swatch?: string;
  facts: readonly (readonly [string, string])[];
}

export const FABRICS = [
  { id: 'sand', name: 'Sand', color: '#cdbfa8' },
  { id: 'moss', name: 'Moos', color: '#9fae93' },
  { id: 'dove', name: 'Taubenblau', color: '#9db1be' },
  { id: 'brick', name: 'Ziegel', color: '#c0896d' },
  { id: 'graphite', name: 'Graphit', color: '#5d6669' },
] as const;

export const INITIAL_FURNITURE: readonly Furniture[] = [
  {
    id: 'rug',
    kind: 'rug',
    name: 'Teppich, Wolle',
    x: 1.55,
    y: 1.35,
    w: 2.9,
    d: 2.0,
    height: 1,
    rotation: 0,
    material: 'Schurwolle',
    price: 390,
    onList: false,
    facts: [['Flor', 'kurz, 8 mm']],
  },
  {
    id: 'sofa',
    kind: 'sofa',
    name: 'Sofa, 3-Sitzer',
    x: 1.86,
    y: 0.18,
    w: 2.28,
    d: 0.94,
    height: 82,
    rotation: 0,
    material: 'Bouclé',
    price: 1290,
    onList: true,
    swatch: 'sand',
    facts: [
      ['Sitzhöhe', '44 cm'],
      ['Lieferzeit', '4 bis 6 Wochen'],
    ],
  },
  {
    id: 'table',
    kind: 'table',
    name: 'Couchtisch, Eiche',
    x: 2.45,
    y: 1.95,
    w: 1.1,
    d: 0.6,
    height: 40,
    rotation: 0,
    material: 'Eiche geölt',
    price: 420,
    onList: false,
    facts: [['Oberfläche', 'geölt']],
  },
  {
    id: 'armchair',
    kind: 'armchair',
    name: 'Sessel',
    x: 0.55,
    y: 2.3,
    w: 0.8,
    d: 0.8,
    height: 78,
    rotation: 90,
    material: 'Leinen',
    price: 640,
    onList: false,
    swatch: 'moss',
    facts: [['Sitzhöhe', '42 cm']],
  },
  {
    id: 'lamp',
    kind: 'lamp',
    name: 'Stehleuchte',
    x: 0.45,
    y: 0.45,
    w: 0.42,
    d: 0.42,
    height: 165,
    rotation: 0,
    material: 'Messing, Leinenschirm',
    price: 189,
    onList: true,
    facts: [['Licht', 'warmweiß, dimmbar']],
  },
  {
    id: 'reading-lamp',
    kind: 'lamp',
    name: 'Leseleuchte',
    x: 5.2,
    y: 0.35,
    w: 0.36,
    d: 0.36,
    height: 140,
    rotation: 0,
    material: 'Stahl, pulverbeschichtet',
    price: 129,
    onList: false,
    facts: [['Licht', 'warmweiß']],
  },
  {
    id: 'shelf',
    kind: 'shelf',
    name: 'Bücherregal',
    x: 0.25,
    y: 4.0,
    w: 1.8,
    d: 0.35,
    height: 200,
    rotation: 0,
    material: 'Esche',
    price: 560,
    onList: false,
    facts: [['Fächer', '5 × 4']],
  },
  {
    id: 'plant',
    kind: 'plant',
    name: 'Zimmerpflanze',
    x: 5.15,
    y: 3.55,
    w: 0.6,
    d: 0.6,
    height: 120,
    rotation: 0,
    material: 'Topf aus Terrakotta',
    price: 79,
    onList: false,
    facts: [['Standort', 'hell, keine Mittagssonne']],
  },
];

interface Window {
  wall: 'east' | 'south';
  from: number;
  to: number;
}

/** Fenster nach Osten (Morgensonne) und nach Süden (Mittag und Nachmittag) */
export const WINDOWS: readonly Window[] = [
  { wall: 'east', from: 1.2, to: 2.8 },
  { wall: 'south', from: 3.0, to: 4.6 },
];

const SILL = 0.9;
const LINTEL = 2.1;

function windowEdge(window: Window): { p0: Point; p1: Point; normal: Point } {
  return window.wall === 'east'
    ? { p0: [ROOM.width, window.from], p1: [ROOM.width, window.to], normal: [1, 0] }
    : { p0: [window.from, ROOM.depth], p1: [window.to, ROOM.depth], normal: [0, 1] };
}

/**
 * Sonnenflecken auf dem Boden: Jede Scheibe (Brüstung bis Sturz) wird in Richtung des Lichts
 * auf den Boden projiziert. Abschneiden am Raum übernimmt die Zeichnung (clipPath).
 */
export function sunPatches(hours: number): Point[][] {
  const { azimuth, elevation } = sunPosition(hours);
  if (elevation < 3) return [];
  const a = (azimuth * Math.PI) / 180;
  // Richtung zur Sonne im Grundriss (x Osten, y Süden)
  const toSun: Point = [Math.sin(a), -Math.cos(a)];
  const reach = 1 / Math.tan((elevation * Math.PI) / 180);
  return WINDOWS.flatMap((window) => {
    const { p0, p1, normal } = windowEdge(window);
    // Streifendes Licht schirmt die Laibung ab
    if (toSun[0] * normal[0] + toSun[1] * normal[1] <= 0.2) return [];
    const shift = (p: Point, height: number): Point => [
      p[0] - toSun[0] * height * reach,
      p[1] - toSun[1] * height * reach,
    ];
    return [[shift(p0, SILL), shift(p1, SILL), shift(p1, LINTEL), shift(p0, LINTEL)]];
  });
}

/** Wie dunkel der Abend über dem Raum liegt: 0 am Tag, bis 1 in der Nacht. */
export function eveningAmount(hours: number): number {
  const { elevation } = sunPosition(hours);
  return Math.max(0, Math.min(1, (8 - elevation) / 12));
}

/** Größe auf dem Boden nach Drehung */
export function footprint(item: Furniture): { x0: number; y0: number; x1: number; y1: number } {
  const turned = item.rotation === 90 || item.rotation === 270;
  const w = turned ? item.d : item.w;
  const d = turned ? item.w : item.d;
  const cx = item.x + item.w / 2;
  const cy = item.y + item.d / 2;
  return { x0: cx - w / 2, y0: cy - d / 2, x1: cx + w / 2, y1: cy + d / 2 };
}

export interface SceneFrame {
  scale: number;
  ox: number;
  oy: number;
}

/** Spielraum um den Raum in Metern, für Wände und Maßangaben */
const SCENE_MARGIN = 0.55;

/**
 * Legt den Raum auf die Bühne: am PC links der Mitte (rechts bleibt Platz für die Karte),
 * auf dem Handy zwischen Ansichtsleiste und Werkzeugpalette.
 */
export function sceneFrame(
  width: number,
  height: number,
  layout: 'wide' | 'compact',
  zoom: number,
): SceneFrame {
  const area =
    layout === 'compact'
      ? { x0: 16, y0: 128, x1: width - 16, y1: height - 270 }
      : { x0: 112, y0: 96, x1: width - 330, y1: height - 104 };
  const areaWidth = Math.max(120, area.x1 - area.x0);
  const areaHeight = Math.max(120, area.y1 - area.y0);
  const scale =
    Math.min(
      areaWidth / (ROOM.width + 2 * SCENE_MARGIN),
      areaHeight / (ROOM.depth + 2 * SCENE_MARGIN),
    ) * zoom;
  return {
    scale,
    ox: area.x0 + areaWidth / 2 - (ROOM.width / 2) * scale,
    oy: area.y0 + areaHeight / 2 - (ROOM.depth / 2) * scale,
  };
}
