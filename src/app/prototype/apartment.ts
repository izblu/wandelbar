/**
 * Beispielwohnung „Lindenstraße 12“ für den klickbaren Prototyp (MD).
 *
 * Vorläufige Typen: Das echte, versionierte Datenmodell entsteht in M1 (`src/model/`). Bis dahin
 * hält diese Datei alles, was der Prototyp zum Zeigen braucht. Maße in Metern; x wächst nach
 * Osten des Plans, y nach Süden. Der Ursprung liegt in der inneren Ecke oben links.
 */

export type Point = readonly [number, number];

export interface Wall {
  id: string;
  /** Mittellinie von a nach b */
  a: Point;
  b: Point;
  thickness: number;
  /** Raumhöhe an dieser Wand in Metern */
  height: number;
  exterior: boolean;
}

export type OpeningKind = 'door' | 'window';

export interface Opening {
  id: string;
  wallId: string;
  kind: OpeningKind;
  /** Abstand vom Punkt a der Wand bis zum Anfang der Öffnung */
  offset: number;
  width: number;
  height: number;
  /** Brüstung über dem Boden; bei Türen 0 */
  sill: number;
  /** Fenster: der Raum, in den das Licht fällt. Türen: der Raum, in den sie aufgeht. */
  roomId: string;
  /** Tür: Band am Anfang (start) oder am Ende (end) der Öffnung */
  hinge?: 'start' | 'end';
  /** Wohnungstür */
  entrance?: boolean;
  /** Sicherheit der Erkennung von 0 bis 1; unter 0,7 gilt sie als unsicher */
  confidence: number;
}

export interface Room {
  id: string;
  name: string;
  polygon: readonly Point[];
  /** Deckenhöhe in Metern */
  ceiling: number;
  floor: string;
  paint: string;
  /** Wo Name und Fläche stehen */
  label: Point;
}

export type FurnitureKind =
  | 'sofa'
  | 'armchair'
  | 'coffeeTable'
  | 'dining'
  | 'bed'
  | 'nightstand'
  | 'wardrobe'
  | 'desk'
  | 'officeChair'
  | 'shelf'
  | 'sideboard'
  | 'lamp'
  | 'plant'
  | 'rug'
  | 'kitchen'
  | 'bathtub'
  | 'washbasin'
  | 'toilet';

export interface Furniture {
  id: string;
  kind: FurnitureKind;
  name: string;
  /** Linke obere Ecke, ungedreht */
  x: number;
  y: number;
  /** Breite und Tiefe in Metern, Höhe in Zentimetern (wie in der Karte) */
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

export interface Apartment {
  name: string;
  /** Datei, aus der der Grundriss stammt */
  source: string;
  /** Wohnfläche laut Plan in m² */
  statedArea: number;
  /** Faktor auf alle Maße nach dem Nachmessen (1 = wie erkannt) */
  scale: number;
  scaleConfirmed: boolean;
  /** Richtung, in die Norden auf dem Plan zeigt, in Grad im Uhrzeigersinn von oben */
  north: number;
  northConfirmed: boolean;
  walls: Wall[];
  openings: Opening[];
  rooms: Room[];
  furniture: Furniture[];
}

/* ------------------------------------------------------------------ Farben der Szene */

/** Bezugsstoffe; Datenwerte wie auf der Übersichtsseite */
export const FABRICS = [
  { id: 'sand', name: 'Sand', color: '#cdbfa8' },
  { id: 'moss', name: 'Moos', color: '#9fae93' },
  { id: 'dove', name: 'Taubenblau', color: '#9db1be' },
  { id: 'brick', name: 'Ziegel', color: '#c0896d' },
  { id: 'graphite', name: 'Graphit', color: '#5d6669' },
] as const;

/** Wandfarben; die Werte stehen als Tokens in tokens.css (hell und dunkel) */
export const PAINTS = [
  { id: 'limewash', name: 'Kalkweiß', color: 'var(--paint-limewash)' },
  { id: 'sage', name: 'Salbei', color: 'var(--paint-sage)' },
  { id: 'dove', name: 'Taubenblau', color: 'var(--paint-dove)' },
  { id: 'sand', name: 'Sand', color: 'var(--paint-sand)' },
  { id: 'rose', name: 'Ziegelrosa', color: 'var(--paint-rose)' },
] as const;

/** Böden; ebenfalls als Tokens */
export const FLOORS = [
  { id: 'oak', name: 'Eiche hell', color: 'var(--floor-oak)' },
  { id: 'smoked', name: 'Eiche geräuchert', color: 'var(--floor-smoked)' },
  { id: 'white', name: 'Dielen weiß', color: 'var(--floor-white)' },
  { id: 'tile', name: 'Fliese hell', color: 'var(--floor-tile)' },
  { id: 'terracotta', name: 'Terrakotta', color: 'var(--floor-terracotta)' },
] as const;

export function swatchColor(
  list: readonly { id: string; color: string }[],
  id: string | undefined,
): string {
  return list.find((entry) => entry.id === id)?.color ?? list[0]?.color ?? 'currentColor';
}

/* ------------------------------------------------------------------ Bau */

const OUTER = 0.3;
const INNER = 0.12;
const HEIGHT = 2.6;

/** Innenmaße der Wohnung */
export const INTERIOR = { width: 10.4, depth: 8.2 } as const;

const W = INTERIOR.width;
const D = INTERIOR.depth;
const o = OUTER / 2;

const WALLS: Wall[] = [
  // Außenwände, im Uhrzeigersinn ab der Ecke oben links
  { id: 'w-north', a: [-o, -o], b: [W + o, -o], thickness: OUTER, height: HEIGHT, exterior: true },
  {
    id: 'w-east',
    a: [W + o, -o],
    b: [W + o, D + o],
    thickness: OUTER,
    height: HEIGHT,
    exterior: true,
  },
  {
    id: 'w-south',
    a: [W + o, D + o],
    b: [-o, D + o],
    thickness: OUTER,
    height: HEIGHT,
    exterior: true,
  },
  { id: 'w-west', a: [-o, D + o], b: [-o, -o], thickness: OUTER, height: HEIGHT, exterior: true },
  // Innenwände
  {
    id: 'w-sleep-work',
    a: [4.06, 0],
    b: [4.06, 3.56],
    thickness: INNER,
    height: HEIGHT,
    exterior: false,
  },
  {
    id: 'w-work-bath',
    a: [7.46, 0],
    b: [7.46, 3.56],
    thickness: INNER,
    height: HEIGHT,
    exterior: false,
  },
  {
    id: 'w-bath-hall',
    a: [7.46, 2.56],
    b: [W, 2.56],
    thickness: INNER,
    height: HEIGHT,
    exterior: false,
  },
  {
    id: 'w-rooms-hall',
    a: [0, 3.56],
    b: [7.46, 3.56],
    thickness: INNER,
    height: HEIGHT,
    exterior: false,
  },
  {
    id: 'w-living-hall',
    a: [2.84, 3.56],
    b: [2.84, 4.96],
    thickness: INNER,
    height: HEIGHT,
    exterior: false,
  },
  {
    id: 'w-hall-south',
    a: [2.84, 4.96],
    b: [W, 4.96],
    thickness: INNER,
    height: HEIGHT,
    exterior: false,
  },
  {
    id: 'w-living-kitchen',
    a: [5.94, 4.96],
    b: [5.94, D],
    thickness: INNER,
    height: HEIGHT,
    exterior: false,
  },
];

const OPENINGS: Opening[] = [
  // Türen
  {
    id: 'd-entrance',
    wallId: 'w-east',
    kind: 'door',
    offset: 3.55,
    width: 1.0,
    height: 2.1,
    sill: 0,
    roomId: 'hall',
    hinge: 'end',
    entrance: true,
    confidence: 0.94,
  },
  {
    id: 'd-bath',
    wallId: 'w-bath-hall',
    kind: 'door',
    offset: 1.14,
    width: 0.8,
    height: 2.0,
    sill: 0,
    roomId: 'bath',
    hinge: 'end',
    confidence: 0.9,
  },
  {
    id: 'd-sleep',
    wallId: 'w-rooms-hall',
    kind: 'door',
    offset: 3.05,
    width: 0.85,
    height: 2.0,
    sill: 0,
    roomId: 'sleep',
    hinge: 'end',
    confidence: 0.92,
  },
  {
    id: 'd-work',
    wallId: 'w-rooms-hall',
    kind: 'door',
    offset: 5.6,
    width: 0.85,
    height: 2.0,
    sill: 0,
    roomId: 'work',
    hinge: 'start',
    confidence: 0.91,
  },
  {
    id: 'd-living',
    wallId: 'w-hall-south',
    kind: 'door',
    offset: 0.96,
    width: 1.0,
    height: 2.0,
    sill: 0,
    roomId: 'living',
    hinge: 'start',
    confidence: 0.62,
  },
  {
    id: 'd-kitchen',
    wallId: 'w-hall-south',
    kind: 'door',
    offset: 3.66,
    width: 0.85,
    height: 2.0,
    sill: 0,
    roomId: 'kitchen',
    hinge: 'end',
    confidence: 0.88,
  },
  // Fenster
  {
    id: 'f-sleep',
    wallId: 'w-north',
    kind: 'window',
    offset: 1.35,
    width: 1.6,
    height: 1.4,
    sill: 0.9,
    roomId: 'sleep',
    confidence: 0.95,
  },
  {
    id: 'f-work',
    wallId: 'w-north',
    kind: 'window',
    offset: 5.15,
    width: 1.5,
    height: 1.4,
    sill: 0.9,
    roomId: 'work',
    confidence: 0.95,
  },
  {
    id: 'f-bath',
    wallId: 'w-north',
    kind: 'window',
    offset: 8.75,
    width: 0.8,
    height: 0.8,
    sill: 1.5,
    roomId: 'bath',
    confidence: 0.58,
  },
  {
    id: 'f-kitchen-east',
    wallId: 'w-east',
    kind: 'window',
    offset: 6.35,
    width: 1.2,
    height: 1.4,
    sill: 0.9,
    roomId: 'kitchen',
    confidence: 0.93,
  },
  {
    id: 'f-kitchen-south',
    wallId: 'w-south',
    kind: 'window',
    offset: 1.55,
    width: 1.6,
    height: 1.4,
    sill: 0.9,
    roomId: 'kitchen',
    confidence: 0.96,
  },
  {
    id: 'f-living-door',
    wallId: 'w-south',
    kind: 'window',
    offset: 5.55,
    width: 1.6,
    height: 2.2,
    sill: 0,
    roomId: 'living',
    confidence: 0.9,
  },
  {
    id: 'f-living-south',
    wallId: 'w-south',
    kind: 'window',
    offset: 7.95,
    width: 1.6,
    height: 1.5,
    sill: 0.8,
    roomId: 'living',
    confidence: 0.96,
  },
  {
    id: 'f-living-west',
    wallId: 'w-west',
    kind: 'window',
    offset: 0.95,
    width: 1.6,
    height: 1.5,
    sill: 0.8,
    roomId: 'living',
    confidence: 0.96,
  },
];

const ROOMS: Room[] = [
  {
    id: 'sleep',
    name: 'Schlafzimmer',
    polygon: [
      [0, 0],
      [4, 0],
      [4, 3.5],
      [0, 3.5],
    ],
    ceiling: HEIGHT,
    floor: 'oak',
    paint: 'dove',
    label: [2.74, 1.75],
  },
  {
    id: 'work',
    name: 'Arbeitszimmer',
    polygon: [
      [4.12, 0],
      [7.4, 0],
      [7.4, 3.5],
      [4.12, 3.5],
    ],
    ceiling: HEIGHT,
    floor: 'oak',
    paint: 'limewash',
    label: [5.8, 2.15],
  },
  {
    id: 'bath',
    name: 'Bad',
    polygon: [
      [7.52, 0],
      [W, 0],
      [W, 2.5],
      [7.52, 2.5],
    ],
    ceiling: 2.4,
    floor: 'tile',
    paint: 'limewash',
    label: [8.96, 1.4],
  },
  {
    id: 'hall',
    name: 'Flur',
    polygon: [
      [2.9, 3.62],
      [7.52, 3.62],
      [7.52, 2.62],
      [W, 2.62],
      [W, 4.9],
      [2.9, 4.9],
    ],
    ceiling: 2.4,
    floor: 'oak',
    paint: 'limewash',
    label: [5.2, 4.26],
  },
  {
    id: 'living',
    name: 'Wohnzimmer',
    polygon: [
      [0, 3.62],
      [2.78, 3.62],
      [2.78, 5.02],
      [5.88, 5.02],
      [5.88, D],
      [0, D],
    ],
    ceiling: HEIGHT,
    floor: 'oak',
    paint: 'sage',
    label: [1.45, 6.5],
  },
  {
    id: 'kitchen',
    name: 'Küche',
    polygon: [
      [6.0, 5.02],
      [W, 5.02],
      [W, D],
      [6.0, D],
    ],
    ceiling: HEIGHT,
    floor: 'terracotta',
    paint: 'limewash',
    label: [9.55, 6.75],
  },
];

/* ------------------------------------------------------------------ Möbel */

interface CatalogEntry {
  kind: FurnitureKind;
  name: string;
  w: number;
  d: number;
  height: number;
  material: string;
  price: number;
  swatch?: string;
  facts: readonly (readonly [string, string])[];
}

/** Gruppen im Katalog, in der Reihenfolge der Anzeige */
export const CATALOG_GROUPS = [
  'Sitzen',
  'Tische',
  'Schlafen',
  'Aufbewahren',
  'Licht und Grün',
] as const;
export type CatalogGroup = (typeof CATALOG_GROUPS)[number];

export interface CatalogItem extends CatalogEntry {
  id: string;
  group: CatalogGroup;
}

export const CATALOG: readonly CatalogItem[] = [
  {
    id: 'c-sofa',
    group: 'Sitzen',
    kind: 'sofa',
    name: 'Sofa, 3-Sitzer',
    w: 2.28,
    d: 0.94,
    height: 82,
    material: 'Bouclé',
    price: 1290,
    swatch: 'sand',
    facts: [['Sitzhöhe', '44 cm']],
  },
  {
    id: 'c-sofa-2',
    group: 'Sitzen',
    kind: 'sofa',
    name: 'Sofa, 2-Sitzer',
    w: 1.7,
    d: 0.9,
    height: 80,
    material: 'Leinen',
    price: 890,
    swatch: 'dove',
    facts: [['Sitzhöhe', '43 cm']],
  },
  {
    id: 'c-armchair',
    group: 'Sitzen',
    kind: 'armchair',
    name: 'Sessel',
    w: 0.8,
    d: 0.8,
    height: 78,
    material: 'Leinen',
    price: 640,
    swatch: 'moss',
    facts: [['Sitzhöhe', '42 cm']],
  },
  {
    id: 'c-coffee',
    group: 'Tische',
    kind: 'coffeeTable',
    name: 'Couchtisch, Eiche',
    w: 1.1,
    d: 0.6,
    height: 40,
    material: 'Eiche geölt',
    price: 420,
    facts: [['Oberfläche', 'geölt']],
  },
  {
    id: 'c-dining',
    group: 'Tische',
    kind: 'dining',
    name: 'Esstisch mit 4 Stühlen',
    w: 1.4,
    d: 0.85,
    height: 75,
    material: 'Eiche geölt',
    price: 980,
    facts: [['Plätze', '4']],
  },
  {
    id: 'c-desk',
    group: 'Tische',
    kind: 'desk',
    name: 'Schreibtisch',
    w: 1.6,
    d: 0.8,
    height: 74,
    material: 'Esche',
    price: 520,
    facts: [['Höhe', 'fest, 74 cm']],
  },
  {
    id: 'c-bed',
    group: 'Schlafen',
    kind: 'bed',
    name: 'Bett, 160 × 200',
    w: 1.7,
    d: 2.1,
    height: 45,
    material: 'Eiche, Leinen',
    price: 1150,
    facts: [['Matratze', '160 × 200 cm']],
  },
  {
    id: 'c-nightstand',
    group: 'Schlafen',
    kind: 'nightstand',
    name: 'Nachttisch',
    w: 0.45,
    d: 0.4,
    height: 50,
    material: 'Eiche',
    price: 160,
    facts: [['Schubladen', '1']],
  },
  {
    id: 'c-wardrobe',
    group: 'Aufbewahren',
    kind: 'wardrobe',
    name: 'Kleiderschrank',
    w: 2.0,
    d: 0.6,
    height: 220,
    material: 'Esche weiß',
    price: 1340,
    facts: [['Türen', '4']],
  },
  {
    id: 'c-shelf',
    group: 'Aufbewahren',
    kind: 'shelf',
    name: 'Bücherregal',
    w: 1.8,
    d: 0.35,
    height: 200,
    material: 'Esche',
    price: 560,
    facts: [['Fächer', '5 × 4']],
  },
  {
    id: 'c-sideboard',
    group: 'Aufbewahren',
    kind: 'sideboard',
    name: 'Kommode',
    w: 1.6,
    d: 0.45,
    height: 80,
    material: 'Eiche',
    price: 790,
    facts: [['Schubladen', '6']],
  },
  {
    id: 'c-lamp',
    group: 'Licht und Grün',
    kind: 'lamp',
    name: 'Stehleuchte',
    w: 0.42,
    d: 0.42,
    height: 165,
    material: 'Messing, Leinenschirm',
    price: 189,
    facts: [['Licht', 'warmweiß, dimmbar']],
  },
  {
    id: 'c-plant',
    group: 'Licht und Grün',
    kind: 'plant',
    name: 'Zimmerpflanze',
    w: 0.6,
    d: 0.6,
    height: 120,
    material: 'Topf aus Terrakotta',
    price: 79,
    facts: [['Standort', 'hell']],
  },
  {
    id: 'c-rug',
    group: 'Licht und Grün',
    kind: 'rug',
    name: 'Teppich, Wolle',
    w: 2.4,
    d: 1.7,
    height: 1,
    material: 'Schurwolle',
    price: 390,
    facts: [['Flor', 'kurz, 8 mm']],
  },
];

function catalog(id: string): CatalogItem {
  const item = CATALOG.find((entry) => entry.id === id);
  if (!item) throw new Error(`Unbekannter Katalogeintrag: ${id}`);
  return item;
}

let furnitureCount = 0;
/**
 * Kennung für ein neues Möbel, die es unter `taken` noch nicht gibt (die Beispielwohnung hat z. B.
 * schon `nightstand-1`). `crypto.randomUUID` fehlt über http im WLAN (Handy-Test).
 */
export function nextFurnitureId(base: string, taken: readonly { id: string }[]): string {
  const ids = new Set(taken.map((item) => item.id));
  let id: string;
  do {
    furnitureCount += 1;
    id = `${base}-${String(furnitureCount)}`;
  } while (ids.has(id));
  return id;
}

/** Möbel aus dem Katalog an einer Stelle (Mitte) mit Drehung */
export function placeFromCatalog(
  item: CatalogItem,
  id: string,
  center: Point,
  rotation: Furniture['rotation'] = 0,
  overrides: Partial<Furniture> = {},
): Furniture {
  // Maße aus `overrides` zählen schon für die Mitte
  const w = overrides.w ?? item.w;
  const d = overrides.d ?? item.d;
  const entry: Omit<Furniture, 'id' | 'x' | 'y' | 'rotation' | 'onList'> = {
    kind: item.kind,
    name: item.name,
    w,
    d,
    height: item.height,
    material: item.material,
    price: item.price,
    facts: item.facts,
  };
  if (item.swatch) entry.swatch = item.swatch;
  return {
    ...entry,
    id,
    x: center[0] - w / 2,
    y: center[1] - d / 2,
    rotation,
    onList: false,
    ...overrides,
  };
}

const FURNITURE: Furniture[] = [
  // Wohnzimmer
  placeFromCatalog(catalog('c-rug'), 'rug', [3.9, 6.74], 90, { w: 2.6, d: 2.0 }),
  placeFromCatalog(catalog('c-sofa'), 'sofa', [5.41, 6.74], 90, { onList: true }),
  placeFromCatalog(catalog('c-coffee'), 'coffee', [4.0, 6.74], 90),
  placeFromCatalog(catalog('c-armchair'), 'armchair', [3.0, 6.74], 270),
  placeFromCatalog(catalog('c-lamp'), 'floor-lamp', [5.52, 5.3], 0, { onList: true }),
  placeFromCatalog(catalog('c-shelf'), 'shelf', [1.3, 3.8], 0),
  placeFromCatalog(catalog('c-plant'), 'plant', [0.4, 7.8], 0),
  placeFromCatalog(catalog('c-sideboard'), 'sideboard', [0.26, 4.75], 90, { w: 1.4 }),
  {
    ...placeFromCatalog(catalog('c-lamp'), 'reading-lamp', [2.45, 5.6], 0),
    name: 'Leseleuchte',
    w: 0.36,
    d: 0.36,
    height: 140,
    price: 129,
    material: 'Stahl, pulverbeschichtet',
  },
  // Schlafzimmer
  placeFromCatalog(catalog('c-bed'), 'bed', [1.05, 1.8], 270),
  placeFromCatalog(catalog('c-nightstand'), 'nightstand-1', [0.22, 0.6], 90),
  placeFromCatalog(catalog('c-nightstand'), 'nightstand-2', [0.22, 3.0], 90),
  placeFromCatalog(catalog('c-wardrobe'), 'wardrobe', [3.68, 1.5], 270),
  // Arbeitszimmer
  placeFromCatalog(catalog('c-desk'), 'desk', [5.75, 0.42], 0),
  {
    id: 'office-chair',
    kind: 'officeChair',
    name: 'Bürostuhl',
    x: 5.45,
    y: 0.95,
    w: 0.6,
    d: 0.6,
    height: 105,
    rotation: 0,
    material: 'Netzgewebe',
    price: 340,
    onList: false,
    facts: [['Sitzhöhe', '42 bis 54 cm']],
  },
  placeFromCatalog(catalog('c-shelf'), 'work-shelf', [4.3, 1.9], 90),
  placeFromCatalog(catalog('c-armchair'), 'work-armchair', [6.9, 2.95], 270, { swatch: 'brick' }),
  placeFromCatalog(catalog('c-plant'), 'work-plant', [7.0, 0.4], 0, { w: 0.5, d: 0.5 }),
  // Bad
  {
    id: 'bathtub',
    kind: 'bathtub',
    name: 'Badewanne',
    x: 7.045,
    y: 0.475,
    w: 1.7,
    d: 0.75,
    height: 58,
    rotation: 90,
    material: 'Stahl emailliert',
    price: 0,
    onList: false,
    facts: [['Bestand', 'gehört zur Wohnung']],
  },
  {
    id: 'washbasin',
    kind: 'washbasin',
    name: 'Waschtisch',
    x: 9.875,
    y: 1.275,
    w: 0.6,
    d: 0.45,
    height: 85,
    rotation: 90,
    material: 'Keramik',
    price: 0,
    onList: false,
    facts: [['Bestand', 'gehört zur Wohnung']],
  },
  {
    id: 'toilet',
    kind: 'toilet',
    name: 'WC',
    x: 9.6,
    y: 0,
    w: 0.38,
    d: 0.6,
    height: 40,
    rotation: 0,
    material: 'Keramik',
    price: 0,
    onList: false,
    facts: [['Bestand', 'gehört zur Wohnung']],
  },
  // Küche
  {
    id: 'kitchen',
    kind: 'kitchen',
    name: 'Küchenzeile',
    x: 7.5,
    y: 5.02,
    w: 2.9,
    d: 0.62,
    height: 90,
    rotation: 0,
    material: 'Eiche, Arbeitsplatte Stein',
    price: 0,
    onList: false,
    facts: [['Bestand', 'gehört zur Wohnung']],
  },
  placeFromCatalog(catalog('c-dining'), 'dining', [8.0, 7.0], 0),
];

/** Die Beispielwohnung, fertig eingerichtet */
export function sampleApartment(): Apartment {
  return {
    name: 'Lindenstraße 12',
    source: 'lindenstrasse-12-grundriss.pdf',
    statedArea: 82,
    scale: 1,
    scaleConfirmed: true,
    north: 0,
    northConfirmed: true,
    walls: WALLS.map((wall) => ({ ...wall })),
    openings: OPENINGS.map((opening) => ({ ...opening })),
    rooms: ROOMS.map((room) => ({ ...room })),
    furniture: FURNITURE.map((item) => ({ ...item })),
  };
}

/**
 * Ergebnis der (im Prototyp gespielten) Erkennung: derselbe Bau ohne Möbel. Bad und Küche bringen
 * ihre festen Teile mit. Maßstab und Norden sind noch zu bestätigen.
 */
export function recognizedApartment(name: string, source: string): Apartment {
  const sample = sampleApartment();
  const fixtures = new Set<FurnitureKind>(['bathtub', 'washbasin', 'toilet', 'kitchen']);
  return {
    ...sample,
    name,
    source,
    scaleConfirmed: false,
    northConfirmed: false,
    rooms: sample.rooms.map((room) => ({
      ...room,
      floor: room.id === 'bath' ? 'tile' : 'oak',
      paint: 'limewash',
    })),
    furniture: sample.furniture.filter((item) => fixtures.has(item.kind)),
  };
}
