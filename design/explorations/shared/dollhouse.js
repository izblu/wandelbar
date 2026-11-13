/**
 * Puppenhaus-Ansicht der Beispielwohnung „Lindenstraße 12“ für die Design-Entwürfe (MD, Runde 1).
 *
 * Reines SVG ohne Bibliotheken. Koordinaten in Metern: x nach Osten, y nach Süden, z nach oben.
 * Die Darstellung (Farben, Linien, Schrift, Schatten) kommt vollständig aus dem CSS der jeweiligen
 * Richtung. Das Skript erzeugt nur Geometrie und Klassen.
 *
 * Wichtig für die CSP: keine `style`-Attribute im Markup. Eigene Farben werden nach dem Einfügen
 * per CSSOM gesetzt (`element.style.setProperty`).
 */

const H_FULL = 2.6; // hintere Außenwände in voller Höhe
const H_CUT = 1.05; // vordere und innere Wände, für die Puppenhaus-Ansicht gekappt
const SILL = 0.9;
const HEAD = 2.2;

// ---------------------------------------------------------------------------------------------
// Räume
// ---------------------------------------------------------------------------------------------

export const rooms = [
  {
    id: 'schlafen',
    name: 'Schlafen',
    x0: 0,
    y0: 0,
    x1: 3.8,
    y1: 3.4,
    floor: 'wood',
    label: [2.75, 2.85],
  },
  { id: 'bad', name: 'Bad', x0: 3.8, y0: 0, x1: 6, y1: 2.4, floor: 'tile', label: [4.95, 1.95] },
  {
    id: 'kueche',
    name: 'Küche',
    x0: 6,
    y0: 0,
    x1: 10.8,
    y1: 3.4,
    floor: 'tile',
    label: [6.95, 1.5],
  },
  {
    id: 'arbeiten',
    name: 'Arbeiten',
    x0: 0,
    y0: 3.4,
    x1: 3.8,
    y1: 7.6,
    floor: 'wood',
    label: [2.55, 5.15],
  },
  { id: 'flur', name: 'Flur', x0: 3.8, y0: 2.4, x1: 6, y1: 7.6, floor: 'wood', label: [4.9, 5.0] },
  {
    id: 'wohnen',
    name: 'Wohnen',
    x0: 6,
    y0: 3.4,
    x1: 10.8,
    y1: 7.6,
    floor: 'wood',
    label: [8.55, 6.75],
  },
];

export const totalArea = rooms.reduce((sum, r) => sum + (r.x1 - r.x0) * (r.y1 - r.y0), 0);

const de1 = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const formatArea = (m2) => `${de1.format(m2)} m²`;
export const roomArea = (room) => (room.x1 - room.x0) * (room.y1 - room.y0);

// ---------------------------------------------------------------------------------------------
// Wände mit Fenstern und Türen. `a`/`b` liegen auf der Längsachse der Wand.
// ---------------------------------------------------------------------------------------------

const walls = [
  // Außenwände (24 cm)
  {
    axis: 'x',
    x0: -0.12,
    x1: 10.92,
    y0: -0.12,
    y1: 0.12,
    h: H_FULL,
    openings: [
      { a: 1.2, b: 2.6, type: 'window' },
      { a: 4.5, b: 5.3, type: 'window' },
      { a: 7.3, b: 8.5, type: 'window' },
      { a: 9.9, b: 10.5, type: 'window' },
    ],
  },
  {
    axis: 'y',
    x0: -0.12,
    x1: 0.12,
    y0: 0.12,
    y1: 7.72,
    h: H_FULL,
    openings: [{ a: 4.0, b: 5.2, type: 'window' }],
  },
  {
    axis: 'x',
    x0: 0.12,
    x1: 10.92,
    y0: 7.48,
    y1: 7.72,
    h: H_CUT,
    openings: [
      { a: 1.0, b: 2.6, type: 'window' },
      { a: 4.4, b: 5.4, type: 'door', hinge: 'a', swing: -1 },
      { a: 7.0, b: 8.4, type: 'window' },
      { a: 9.2, b: 10.4, type: 'window' },
    ],
  },
  {
    axis: 'y',
    x0: 10.68,
    x1: 10.92,
    y0: 0.12,
    y1: 7.48,
    h: H_CUT,
    openings: [
      { a: 1.0, b: 2.2, type: 'window' },
      { a: 4.2, b: 5.4, type: 'window' },
    ],
  },
  // Innenwände (12 cm)
  {
    axis: 'y',
    x0: 3.74,
    x1: 3.86,
    y0: 0.12,
    y1: 7.48,
    h: H_CUT,
    openings: [
      { a: 2.6, b: 3.25, type: 'door', hinge: 'b', swing: -1 },
      { a: 5.9, b: 6.75, type: 'door', hinge: 'a', swing: -1 },
    ],
  },
  {
    axis: 'y',
    x0: 5.94,
    x1: 6.06,
    y0: 0.12,
    y1: 7.48,
    h: H_CUT,
    openings: [
      { a: 2.55, b: 3.25, type: 'door', hinge: 'b', swing: 1 },
      { a: 3.55, b: 4.4, type: 'door', hinge: 'a', swing: 1 },
    ],
  },
  { axis: 'x', x0: 0.12, x1: 3.74, y0: 3.34, y1: 3.46, h: H_CUT, openings: [] },
  {
    axis: 'x',
    x0: 3.86,
    x1: 5.94,
    y0: 2.34,
    y1: 2.46,
    h: H_CUT,
    openings: [{ a: 4.4, b: 5.1, type: 'door', hinge: 'a', swing: -1 }],
  },
  {
    axis: 'x',
    x0: 6.06,
    x1: 10.68,
    y0: 3.34,
    y1: 3.46,
    h: H_CUT,
    openings: [{ a: 6.4, b: 7.6, type: 'passage' }],
  },
];

function wallBoxes(w) {
  const out = [];
  const start = w.axis === 'x' ? w.x0 : w.y0;
  const end = w.axis === 'x' ? w.x1 : w.y1;
  const mid = w.axis === 'x' ? (w.y0 + w.y1) / 2 : (w.x0 + w.x1) / 2;
  const seg = (a, b, z0, z1, mat, thin = false) => {
    if (b - a < 0.005 || z1 - z0 < 0.005) return;
    if (w.axis === 'x') {
      const y0 = thin ? mid - 0.025 : w.y0;
      const y1 = thin ? mid + 0.025 : w.y1;
      out.push({ x0: a, x1: b, y0, y1, z0, z1, mat });
    } else {
      const x0 = thin ? mid - 0.025 : w.x0;
      const x1 = thin ? mid + 0.025 : w.x1;
      out.push({ x0, x1, y0: a, y1: b, z0, z1, mat });
    }
  };
  let cur = start;
  for (const op of [...w.openings].sort((p, q) => p.a - q.a)) {
    seg(cur, op.a, 0, w.h, 'wall');
    if (op.type === 'window') {
      seg(op.a, op.b, 0, SILL, 'wall');
      seg(op.a, op.b, SILL, Math.min(HEAD, w.h), 'glass', true);
      if (w.h > HEAD) seg(op.a, op.b, HEAD, w.h, 'wall');
    }
    cur = op.b;
  }
  seg(cur, end, 0, w.h, 'wall');
  return out;
}

// Türschwenk als Viertelkreis auf dem Boden (nur Innen- und Eingangstüren)
function doorSwings() {
  const swings = [];
  for (const w of walls) {
    const mid = w.axis === 'x' ? (w.y0 + w.y1) / 2 : (w.x0 + w.x1) / 2;
    for (const op of w.openings) {
      if (op.type !== 'door') continue;
      const hingeAt = op.hinge === 'a' ? op.a : op.b;
      const closedAt = op.hinge === 'a' ? op.b : op.a;
      const r = op.b - op.a;
      const along = Math.sign(closedAt - hingeAt);
      const hinge = w.axis === 'x' ? [hingeAt, mid] : [mid, hingeAt];
      const c = w.axis === 'x' ? [along, 0] : [0, along];
      const o = w.axis === 'x' ? [0, op.swing] : [op.swing, 0];
      swings.push({ hinge, c, o, r });
    }
  }
  return swings;
}

// ---------------------------------------------------------------------------------------------
// Möbel. Teile werden lokal beschrieben: u entlang der Breite, v von vorn (0) nach hinten (D).
// ---------------------------------------------------------------------------------------------

function placer(x0, y0, x1, y1, facing) {
  const alongX = facing === 'n' || facing === 's';
  const W = alongX ? x1 - x0 : y1 - y0;
  const D = alongX ? y1 - y0 : x1 - x0;
  const map = (u, v) => {
    switch (facing) {
      case 'n':
        return [x0 + u, y0 + v];
      case 's':
        return [x1 - u, y1 - v];
      case 'e':
        return [x1 - v, y0 + u];
      default:
        return [x0 + v, y1 - u];
    }
  };
  const part = (u0, u1, v0, v1, z0, z1, mat) => {
    const [ax, ay] = map(u0, v0);
    const [bx, by] = map(u1, v1);
    return {
      x0: Math.min(ax, bx),
      x1: Math.max(ax, bx),
      y0: Math.min(ay, by),
      y1: Math.max(ay, by),
      z0,
      z1,
      mat,
    };
  };
  return { W, D, part };
}

const box = (x0, y0, x1, y1, z0, z1, mat) => ({ x0, y0, x1, y1, z0, z1, mat });

function sofaParts(
  f,
  { h = 0.82, seat = 0.44, armH = 0.62, back = 0.22, arm = 0.18, mat = 'fabric' } = {},
) {
  const { W, D, part } = f;
  const parts = [
    part(0, W, D - back, D, 0, h, mat),
    part(0, arm, 0, D - back, 0, armH, mat),
    part(W - arm, W, 0, D - back, 0, armH, mat),
    part(arm, W - arm, 0.02, D - back, 0, seat - 0.1, mat),
  ];
  const inner = W - 2 * arm;
  const n = inner > 1.5 ? 3 : inner > 1 ? 2 : 1;
  const cw = inner / n;
  for (let i = 0; i < n; i++) {
    const u0 = arm + i * cw + 0.012;
    const u1 = arm + (i + 1) * cw - 0.012;
    parts.push(part(u0, u1, 0, D - back - 0.16, seat - 0.1, seat, `${mat} cushion`));
    parts.push(part(u0, u1, D - back - 0.16, D - back, seat - 0.1, seat + 0.26, `${mat} cushion`));
  }
  return parts;
}

function tableParts(f, h, top = 'wood', legs = 'wood', leg = 0.05, inset = 0.05, t = 0.035) {
  const { W, D, part } = f;
  return [
    part(inset, inset + leg, inset, inset + leg, 0, h - t, legs),
    part(W - inset - leg, W - inset, inset, inset + leg, 0, h - t, legs),
    part(inset, inset + leg, D - inset - leg, D - inset, 0, h - t, legs),
    part(W - inset - leg, W - inset, D - inset - leg, D - inset, 0, h - t, legs),
    part(0, W, 0, D, h - t, h, top),
  ];
}

function chairParts(f, mat = 'wood') {
  const { W, D, part } = f;
  return [
    part(W / 2 - 0.025, W / 2 + 0.025, D / 2 - 0.025, D / 2 + 0.025, 0, 0.42, 'metal'),
    part(0, W, 0, D, 0.42, 0.46, mat),
    part(0.02, W - 0.02, D - 0.045, D, 0.46, 0.88, mat),
  ];
}

function cabinetParts(f, h, body = 'white', top = 'wood', t = 0.03) {
  const { W, D, part } = f;
  return [part(0, W, 0, D, 0, h - t, body), part(0, W, 0, D, h - t, h, top)];
}

/**
 * Möbel der Beispielwohnung. `dims` in cm (Breite × Tiefe × Höhe), Preise in Euro.
 * `facts` erscheinen in der Eigenschaftenkarte, `gaps` als Maßlinien in der Szene.
 */
export const items = [
  // Wohnen
  {
    id: 'sofa',
    name: 'Sofa, 3-Sitzer',
    room: 'wohnen',
    dims: [228, 94, 82],
    price: 1290,
    material: 'Bouclé',
    facing: 's',
    swatchable: true,
    parts: sofaParts(placer(8.1, 3.58, 10.38, 4.52, 's')),
    facts: [
      ['Abstand zur Wand', '12 cm'],
      ['Zum Couchtisch', '45 cm'],
    ],
    gaps: [{ from: [9.24, 4.52, 0.4], to: [9.24, 4.97, 0.4], label: '45 cm' }],
  },
  {
    id: 'couchtisch',
    name: 'Couchtisch',
    room: 'wohnen',
    dims: [110, 60, 40],
    price: 329,
    material: 'Eiche geölt',
    facing: 'n',
    parts: tableParts(placer(8.69, 4.97, 9.79, 5.57, 'n'), 0.4, 'wood', 'wood', 0.06, 0.04, 0.04),
  },
  {
    id: 'sessel',
    name: 'Sessel',
    room: 'wohnen',
    dims: [80, 82, 78],
    price: 549,
    material: 'Cord',
    facing: 'e',
    swatchable: true,
    parts: sofaParts(placer(7.0, 4.95, 7.82, 5.75, 'e'), {
      h: 0.78,
      armH: 0.6,
      arm: 0.14,
      mat: 'fabric2',
    }),
  },
  {
    id: 'regal',
    name: 'Bücherregal',
    room: 'wohnen',
    dims: [100, 35, 190],
    price: 259,
    material: 'Eiche',
    facing: 'e',
    parts: [box(6.1, 4.6, 6.45, 5.6, 0, 1.9, 'wood')],
  },
  {
    id: 'stehleuchte',
    name: 'Stehleuchte',
    room: 'wohnen',
    dims: [36, 36, 165],
    price: 189,
    material: 'Leinen',
    facing: 'e',
    parts: [
      box(7.13, 4.45, 7.33, 4.65, 0, 0.03, 'metal'),
      box(7.21, 4.53, 7.25, 4.57, 0.03, 1.35, 'metal'),
      box(7.05, 4.37, 7.41, 4.73, 1.35, 1.65, 'shade'),
    ],
  },
  {
    id: 'pflanze',
    name: 'Monstera',
    room: 'wohnen',
    dims: [60, 60, 125],
    price: 49,
    material: 'Topf Terrakotta',
    facing: 'e',
    parts: [box(6.2, 7.0, 6.6, 7.4, 0, 0.42, 'pot')],
    blobs: [
      { cx: 6.41, cy: 7.22, cz: 0.78, r: 0.3 },
      { cx: 6.25, cy: 7.08, cz: 1.08, r: 0.24 },
      { cx: 6.55, cy: 7.3, cz: 1.04, r: 0.22 },
    ],
  },
  // Küche
  {
    id: 'kueche-zeile',
    name: 'Küchenzeile',
    room: 'kueche',
    dims: [290, 62, 90],
    price: 3480,
    material: 'Fronten Weiß',
    facing: 's',
    parts: [
      ...cabinetParts(placer(6.8, 0.14, 9.7, 0.76, 's'), 0.9, 'white', 'stone', 0.04),
      box(7.6, 0.24, 8.2, 0.62, 0.9, 0.906, 'steel'),
      box(9.0, 0.24, 9.6, 0.64, 0.9, 0.906, 'black'),
      box(8.6, 0.14, 9.7, 0.49, 1.45, 2.15, 'white'),
    ],
  },
  {
    id: 'kuehlschrank',
    name: 'Kühlschrank',
    room: 'kueche',
    dims: [60, 66, 185],
    price: 899,
    material: 'Weiß',
    facing: 's',
    parts: [box(6.1, 0.14, 6.75, 0.8, 0, 1.85, 'white')],
  },
  {
    id: 'esstisch',
    name: 'Esstisch',
    room: 'kueche',
    dims: [160, 90, 75],
    price: 699,
    material: 'Eiche massiv',
    facing: 's',
    parts: tableParts(placer(7.3, 1.7, 8.9, 2.6, 's'), 0.75, 'wood', 'wood'),
  },
  ...[
    [7.55, 1.15, 8.0, 1.6, 's'],
    [8.2, 1.15, 8.65, 1.6, 's'],
    [7.55, 2.7, 8.0, 3.15, 'n'],
    [8.2, 2.7, 8.65, 3.15, 'n'],
  ].map(([x0, y0, x1, y1, facing], i) => ({
    id: `stuhl-${i + 1}`,
    name: 'Stuhl',
    room: 'kueche',
    dims: [45, 45, 88],
    price: 129,
    material: 'Esche',
    facing,
    parts: chairParts(placer(x0, y0, x1, y1, facing), 'wood2'),
  })),
  // Schlafen
  {
    id: 'bett',
    name: 'Bett 180 × 200',
    room: 'schlafen',
    dims: [190, 210, 100],
    price: 899,
    material: 'Stoff Leinen',
    facing: 'e',
    parts: [
      box(0.14, 0.75, 0.24, 2.65, 0, 1.0, 'fabric2'),
      box(0.24, 0.75, 2.24, 2.65, 0, 0.3, 'wood'),
      box(0.26, 0.77, 2.22, 2.63, 0.3, 0.5, 'linen'),
      box(0.95, 0.77, 2.22, 2.63, 0.5, 0.58, 'duvet'),
      box(0.32, 0.85, 0.8, 1.65, 0.5, 0.62, 'linen'),
      box(0.32, 1.75, 0.8, 2.55, 0.5, 0.62, 'linen'),
    ],
  },
  {
    id: 'nachttisch-1',
    name: 'Nachttisch',
    room: 'schlafen',
    dims: [40, 40, 50],
    price: 89,
    material: 'Eiche',
    facing: 'e',
    parts: cabinetParts(placer(0.14, 0.3, 0.54, 0.7, 'e'), 0.5, 'wood', 'wood'),
  },
  {
    id: 'nachttisch-2',
    name: 'Nachttisch',
    room: 'schlafen',
    dims: [40, 40, 50],
    price: 89,
    material: 'Eiche',
    facing: 'e',
    parts: cabinetParts(placer(0.14, 2.7, 0.54, 3.1, 'e'), 0.5, 'wood', 'wood'),
  },
  {
    id: 'schrank',
    name: 'Kleiderschrank',
    room: 'schlafen',
    dims: [100, 62, 220],
    price: 579,
    material: 'Weiß',
    facing: 's',
    parts: [box(2.7, 0.14, 3.7, 0.76, 0, 2.2, 'white')],
  },
  // Arbeiten
  {
    id: 'schreibtisch',
    name: 'Schreibtisch',
    room: 'arbeiten',
    dims: [160, 75, 74],
    price: 389,
    material: 'Eiche',
    facing: 'e',
    parts: [
      ...tableParts(placer(0.14, 4.0, 0.89, 5.6, 'e'), 0.74, 'wood', 'metal', 0.04, 0.04, 0.03),
      box(0.22, 4.74, 0.34, 4.86, 0.74, 0.86, 'metal'),
      box(0.25, 4.5, 0.29, 5.1, 0.86, 1.2, 'screen'),
    ],
  },
  {
    id: 'buerostuhl',
    name: 'Bürostuhl',
    room: 'arbeiten',
    dims: [62, 62, 105],
    price: 319,
    material: 'Netzstoff',
    facing: 'w',
    parts: [
      box(1.0, 4.55, 1.5, 5.05, 0, 0.05, 'metal'),
      box(1.22, 4.77, 1.28, 4.83, 0.05, 0.44, 'metal'),
      box(1.0, 4.55, 1.44, 5.05, 0.44, 0.52, 'fabric2'),
      box(1.44, 4.6, 1.5, 5.0, 0.48, 1.0, 'fabric2'),
    ],
  },
  {
    id: 'regal-arbeiten',
    name: 'Regal',
    room: 'arbeiten',
    dims: [80, 35, 180],
    price: 149,
    material: 'Weiß',
    facing: 's',
    parts: [box(2.2, 3.48, 3.0, 3.83, 0, 1.8, 'white')],
  },
  {
    id: 'schlafsofa',
    name: 'Schlafsofa',
    room: 'arbeiten',
    dims: [200, 90, 80],
    price: 749,
    material: 'Webstoff',
    facing: 'n',
    swatchable: true,
    parts: sofaParts(placer(1.3, 6.55, 3.3, 7.45, 'n'), { h: 0.8, mat: 'fabric2' }),
  },
  // Bad
  {
    id: 'wanne',
    name: 'Badewanne',
    room: 'bad',
    dims: [170, 75, 58],
    price: 649,
    material: 'Acryl',
    facing: 's',
    parts: [
      box(3.9, 0.14, 5.6, 0.89, 0, 0.58, 'ceramic'),
      box(4.0, 0.24, 5.5, 0.79, 0.58, 0.585, 'water'),
    ],
  },
  {
    id: 'waschtisch',
    name: 'Waschtisch',
    room: 'bad',
    dims: [60, 48, 85],
    price: 279,
    material: 'Keramik',
    facing: 'e',
    parts: [
      box(3.9, 1.2, 4.38, 1.8, 0, 0.85, 'ceramic'),
      box(3.98, 1.3, 4.3, 1.7, 0.85, 0.855, 'water'),
    ],
  },
  {
    id: 'wc',
    name: 'WC',
    room: 'bad',
    dims: [40, 62, 80],
    price: 239,
    material: 'Keramik',
    facing: 'w',
    parts: [
      box(5.75, 1.35, 5.92, 1.75, 0, 0.8, 'ceramic'),
      box(5.3, 1.4, 5.75, 1.7, 0, 0.42, 'ceramic'),
    ],
  },
  // Flur
  {
    id: 'garderobe',
    name: 'Garderobe',
    room: 'flur',
    dims: [130, 35, 190],
    price: 219,
    material: 'Eiche',
    facing: 'e',
    parts: [box(3.88, 3.7, 4.23, 5.0, 0, 1.9, 'wood')],
  },
  {
    id: 'schuhschrank',
    name: 'Schuhschrank',
    room: 'flur',
    dims: [100, 42, 50],
    price: 159,
    material: 'Eiche',
    facing: 'w',
    parts: cabinetParts(placer(5.5, 6.0, 5.92, 7.0, 'w'), 0.5, 'white', 'wood'),
  },
];

const rugs = [
  { cls: 'rug-1', x0: 8.0, y0: 4.25, x1: 10.45, y1: 6.05 },
  { cls: 'rug-2', x0: 1.5, y0: 0.95, x1: 3.0, y1: 2.45 },
  { cls: 'rug-3', x0: 4.45, y0: 3.0, x1: 5.35, y1: 6.4 },
  { cls: 'rug-4', x0: 4.1, y0: 0.95, x1: 4.9, y1: 1.35 },
];

// Morgenlicht durch die Ostfenster (Sonne aus Ost-Südost, etwa 30° hoch)
const sunPatches = [
  [
    [9.24, 4.62],
    [9.24, 5.82],
    [7.0, 6.42],
    [7.0, 5.22],
  ],
  [
    [9.24, 1.42],
    [9.24, 2.62],
    [7.0, 3.22],
    [7.0, 2.02],
  ],
];

// Lichtkegel der Lampen am Abend
const glows = [
  { x: 7.23, y: 4.55, r: 1.7 },
  { x: 8.1, y: 2.15, r: 1.5 },
  { x: 0.34, y: 0.5, r: 0.9 },
  { x: 0.34, y: 2.9, r: 0.9 },
  { x: 0.5, y: 4.8, r: 1.0 },
];

const basePlate = { x0: -0.45, y0: -0.45, x1: 11.25, y1: 8.05, z0: -0.22, z1: 0, mat: 'base' };

// ---------------------------------------------------------------------------------------------
// Projektion und Zeichnen
// ---------------------------------------------------------------------------------------------

function projector(theta, phi, s, ox, oy) {
  const ct = Math.cos(theta);
  const st = Math.sin(theta);
  const sp = Math.sin(phi);
  const cp = Math.cos(phi);
  const P = (x, y, z = 0) => [
    ox + (x * ct - y * st) * s,
    oy + ((x * st + y * ct) * sp - z * cp) * s,
  ];
  P.basis = { ct, st, sp, cp, s };
  return P;
}

const r1 = (n) => Math.round(n * 10) / 10;
const pts = (list) => list.map(([x, y]) => `${r1(x)},${r1(y)}`).join(' ');
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function corners(b) {
  const out = [];
  for (const x of [b.x0, b.x1])
    for (const y of [b.y0, b.y1]) for (const z of [b.z0, b.z1]) out.push([x, y, z]);
  return out;
}

function screenBounds(b, P) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const [x, y, z] of corners(b)) {
    const [sx, sy] = P(x, y, z);
    x0 = Math.min(x0, sx);
    y0 = Math.min(y0, sy);
    x1 = Math.max(x1, sx);
    y1 = Math.max(y1, sy);
  }
  return { x0, y0, x1, y1 };
}

/** Zeichenreihenfolge: Quader, die hinter anderen liegen, zuerst (topologische Sortierung). */
function sortBoxes(list, P) {
  const EPS = 1e-4;
  const n = list.length;
  const sb = list.map((b) => screenBounds(b, P));
  const depth = (b) => (b.x0 + b.x1) / 2 + (b.y0 + b.y1) / 2 + (b.z0 + b.z1) / 2;
  const before = (a, b) => {
    if (a.x1 <= b.x0 + EPS) return true;
    if (b.x1 <= a.x0 + EPS) return false;
    if (a.y1 <= b.y0 + EPS) return true;
    if (b.y1 <= a.y0 + EPS) return false;
    if (a.z1 <= b.z0 + EPS) return true;
    if (b.z1 <= a.z0 + EPS) return false;
    return depth(a) < depth(b);
  };
  const next = Array.from({ length: n }, () => []);
  const indeg = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const p = sb[i];
      const q = sb[j];
      if (p.x1 <= q.x0 + 0.5 || q.x1 <= p.x0 + 0.5 || p.y1 <= q.y0 + 0.5 || q.y1 <= p.y0 + 0.5)
        continue;
      if (before(list[i], list[j])) {
        next[i].push(j);
        indeg[j]++;
      } else {
        next[j].push(i);
        indeg[i]++;
      }
    }
  }
  const order = [];
  const done = new Array(n).fill(false);
  let ready = list.map((_, i) => i).filter((i) => indeg[i] === 0);
  while (order.length < n) {
    if (ready.length === 0) {
      // Zyklus: den vordersten offenen Quader nach Tiefe nehmen
      const rest = list.map((_, i) => i).filter((i) => !done[i]);
      rest.sort((a, b) => depth(list[a]) - depth(list[b]));
      ready = [rest[0]];
    }
    ready.sort((a, b) => depth(list[a]) - depth(list[b]));
    const i = ready.shift();
    if (done[i]) continue;
    done[i] = true;
    order.push(list[i]);
    for (const j of next[i]) {
      indeg[j]--;
      if (indeg[j] === 0 && !done[j]) ready.push(j);
    }
  }
  return order;
}

function boxMarkup(b, P, sides) {
  const { x0, y0, z0, x1, y1, z1 } = b;
  let out = '';
  if (b.blob) {
    const [cx, cy] = P(b.cx, b.cy, b.cz);
    const r = b.r * P.basis.s;
    out += `<circle class="t" cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(r)}"/>`;
    out += `<circle class="hl" cx="${r1(cx - r * 0.3)}" cy="${r1(cy - r * 0.32)}" r="${r1(r * 0.42)}"/>`;
    return out;
  }
  if (sides) {
    out += `<polygon class="ex" points="${pts([P(x1, y0, z0), P(x1, y1, z0), P(x1, y1, z1), P(x1, y0, z1)])}"/>`;
    out += `<polygon class="sy" points="${pts([P(x0, y1, z0), P(x1, y1, z0), P(x1, y1, z1), P(x0, y1, z1)])}"/>`;
  }
  out += `<polygon class="t" points="${pts([P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)])}"/>`;
  return out;
}

function itemFootprint(item) {
  const all = [...item.parts, ...(item.blobs ?? []).map(blobBox)];
  return {
    x0: Math.min(...all.map((p) => p.x0)),
    y0: Math.min(...all.map((p) => p.y0)),
    x1: Math.max(...all.map((p) => p.x1)),
    y1: Math.max(...all.map((p) => p.y1)),
    z1: Math.max(...all.map((p) => p.z1)),
  };
}

function blobBox(b) {
  return {
    x0: b.cx - b.r,
    x1: b.cx + b.r,
    y0: b.cy - b.r,
    y1: b.cy + b.r,
    z0: b.cz - b.r,
    z1: b.cz + b.r,
  };
}

function floorText(P, cx, cy, alongX, text, cls) {
  const { ct, st, sp, s } = P.basis;
  const [e, f] = P(cx, cy, 0.004);
  const m = alongX
    ? [ct * s, st * sp * s, -st * s, ct * sp * s]
    : [-st * s, ct * sp * s, -ct * s, -st * sp * s];
  return `<text class="${cls}" transform="matrix(${m.map((v) => v.toFixed(4)).join(' ')} ${r1(e)} ${r1(f)})" text-anchor="middle" dominant-baseline="central" font-size="1">${esc(text)}</text>`;
}

/**
 * Zeichnet die Szene in `svg`. Die SVG-Koordinaten entsprechen Bildschirmpixeln, damit Schrift
 * und Linienstärken aus dem CSS unabhängig vom Maßstab gleich bleiben.
 *
 * @returns {{ itemRect: (id: string) => {x0:number,y0:number,x1:number,y1:number,ax:number,ay:number} | null }}
 */
export function renderHouse(svg, state) {
  const { view = 'dollhouse', selected = null, focus = null, colors = {}, zoom = 1 } = state;
  const W = svg.clientWidth;
  const H = svg.clientHeight;
  if (!W || !H) return null;
  const cs = getComputedStyle(svg);
  const num = (name, fallback) => {
    const v = parseFloat(cs.getPropertyValue(name));
    return Number.isFinite(v) ? v : fallback;
  };
  const pad = {
    t: num('--pad-t', 24),
    r: num('--pad-r', 24),
    b: num('--pad-b', 24),
    l: num('--pad-l', 24),
  };
  const plan = view === 'plan';
  const theta = plan ? 0 : (num('--view-theta', 30) * Math.PI) / 180;
  const phi = plan ? Math.PI / 2 : (num('--view-phi', 40) * Math.PI) / 180;

  const wallList = walls.flatMap(wallBoxes);
  const furnitureBoxes = items.flatMap((item) => [
    ...item.parts.map((p) => ({ ...p, item: item.id })),
    ...(item.blobs ?? []).map((b) => ({
      ...b,
      ...blobBox(b),
      blob: true,
      mat: 'plant',
      item: item.id,
    })),
  ]);
  const all = [...wallList, ...furnitureBoxes];

  // Maßstab so wählen, dass die Wohnung (oder der Fokusbereich) in den freien Bereich passt
  const unit = projector(theta, phi, 1, 0, 0);
  let bb = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  const grow = ([x, y]) => {
    bb = {
      x0: Math.min(bb.x0, x),
      y0: Math.min(bb.y0, y),
      x1: Math.max(bb.x1, x),
      y1: Math.max(bb.y1, y),
    };
  };
  if (focus && !plan) {
    for (const x of [focus.x0, focus.x1])
      for (const y of [focus.y0, focus.y1]) for (const z of [0, 1.1]) grow(unit(x, y, z));
  } else {
    for (const b of [...all, basePlate]) for (const [x, y, z] of corners(b)) grow(unit(x, y, z));
  }
  const availW = Math.max(40, W - pad.l - pad.r);
  const availH = Math.max(40, H - pad.t - pad.b);
  const s = Math.min(availW / (bb.x1 - bb.x0), availH / (bb.y1 - bb.y0)) * zoom;
  const ox = pad.l + (availW - (bb.x1 - bb.x0) * s) / 2 - bb.x0 * s;
  // Senkrechte Ausrichtung: 0 = oben, 0.5 = Mitte, 1 = unten (auf dem Handy näher am Daumen)
  const alignY = Math.min(1, Math.max(0, num('--align-y', 0.5)));
  const oy = pad.t + (availH - (bb.y1 - bb.y0) * s) * alignY - bb.y0 * s;
  const P = projector(theta, phi, s, ox, oy);
  const sides = !plan;

  const out = [];
  out.push(`<defs>
    <filter id="soft-blur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${r1(Math.max(2, s * 0.08))}"/></filter>
    <filter id="wide-blur" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${r1(Math.max(6, s * 0.35))}"/></filter>
    <radialGradient id="glow-grad"><stop offset="0" class="glow-stop-0"/><stop offset="1" class="glow-stop-1"/></radialGradient>
  </defs>`);

  // Modellplatte und Schatten
  const bp = basePlate;
  out.push(
    `<polygon class="model-shadow" points="${pts([P(bp.x0, bp.y0, bp.z0), P(bp.x1, bp.y0, bp.z0), P(bp.x1, bp.y1, bp.z0), P(bp.x0, bp.y1, bp.z0)])}"/>`,
  );
  out.push(`<g class="b m-base">${boxMarkup(bp, P, sides)}</g>`);

  // Böden
  out.push('<g class="floors">');
  for (const r of rooms) {
    out.push(
      `<polygon class="floor floor-${r.floor} room-${r.id}" data-room="${r.id}" points="${pts([P(r.x0, r.y0), P(r.x1, r.y0), P(r.x1, r.y1), P(r.x0, r.y1)])}"/>`,
    );
  }
  out.push('</g><g class="floor-lines">');
  for (const r of rooms) {
    if (r.floor === 'wood') {
      for (let y = r.y0 + 0.18; y < r.y1 - 0.05; y += 0.18) {
        const [ax, ay] = P(r.x0, y);
        const [bx, by] = P(r.x1, y);
        out.push(`<line x1="${r1(ax)}" y1="${r1(ay)}" x2="${r1(bx)}" y2="${r1(by)}"/>`);
      }
    } else {
      for (let x = r.x0 + 0.3; x < r.x1 - 0.05; x += 0.3) {
        const [ax, ay] = P(x, r.y0);
        const [bx, by] = P(x, r.y1);
        out.push(`<line x1="${r1(ax)}" y1="${r1(ay)}" x2="${r1(bx)}" y2="${r1(by)}"/>`);
      }
      for (let y = r.y0 + 0.3; y < r.y1 - 0.05; y += 0.3) {
        const [ax, ay] = P(r.x0, y);
        const [bx, by] = P(r.x1, y);
        out.push(`<line x1="${r1(ax)}" y1="${r1(ay)}" x2="${r1(bx)}" y2="${r1(by)}"/>`);
      }
    }
  }
  out.push('</g>');

  // Bodenbeschriftung (Supergrafik), Teppiche, Licht
  out.push('<g class="rugs">');
  for (const rug of rugs) {
    out.push(
      `<polygon class="rug ${rug.cls}" points="${pts([P(rug.x0, rug.y0), P(rug.x1, rug.y0), P(rug.x1, rug.y1), P(rug.x0, rug.y1)])}"/>`,
    );
  }
  out.push('</g><g class="supers">');
  for (const r of rooms) {
    const alongX = r.x1 - r.x0 >= r.y1 - r.y0;
    out.push(
      floorText(
        P,
        (r.x0 + r.x1) / 2,
        (r.y0 + r.y1) / 2,
        alongX,
        r.name.toUpperCase(),
        `super super-${r.id}`,
      ),
    );
  }
  out.push('</g><g class="sun">');
  for (const patch of sunPatches)
    out.push(`<polygon points="${pts(patch.map(([x, y]) => P(x, y)))}"/>`);
  out.push('</g><g class="glows">');
  for (const g of glows) {
    const [cx, cy] = P(g.x, g.y);
    out.push(
      `<ellipse cx="${r1(cx)}" cy="${r1(cy)}" rx="${r1(g.r * s)}" ry="${r1(g.r * s * Math.sin(phi))}" fill="url(#glow-grad)"/>`,
    );
  }
  out.push('</g><g class="doors">');
  for (const d of doorSwings()) {
    const at = (a) => [
      d.hinge[0] + d.r * (Math.cos(a) * d.c[0] + Math.sin(a) * d.o[0]),
      d.hinge[1] + d.r * (Math.cos(a) * d.c[1] + Math.sin(a) * d.o[1]),
    ];
    const arc = [];
    for (let k = 0; k <= 12; k++) arc.push(P(...at((k / 12) * (Math.PI / 2))));
    const [hx, hy] = P(...d.hinge);
    const [qx, qy] = arc[arc.length - 1];
    out.push(
      `<path d="M${r1(hx)},${r1(hy)} L${r1(qx)},${r1(qy)} M${arc.map(([x, y]) => `${r1(x)},${r1(y)}`).join(' L')}"/>`,
    );
  }
  out.push('</g>');

  // Kontaktschatten unter den Möbeln
  out.push('<g class="shadows">');
  for (const item of items) {
    const f = itemFootprint(item);
    const e = 0.03;
    out.push(
      `<polygon points="${pts([P(f.x0 - e, f.y0 - e), P(f.x1 + e, f.y0 - e), P(f.x1 + e, f.y1 + e), P(f.x0 - e, f.y1 + e)])}"/>`,
    );
  }
  out.push('</g>');

  // Auswahlrahmen auf dem Boden
  const selItem = items.find((it) => it.id === selected);
  if (selItem && !plan) {
    const f = itemFootprint(selItem);
    const e = 0.1;
    const ring = [
      P(f.x0 - e, f.y0 - e),
      P(f.x1 + e, f.y0 - e),
      P(f.x1 + e, f.y1 + e),
      P(f.x0 - e, f.y1 + e),
    ];
    out.push(`<g class="sel-floor"><polygon class="sel-ring" points="${pts(ring)}"/>`);
    for (const [x, y] of ring)
      out.push(`<circle class="sel-handle" cx="${r1(x)}" cy="${r1(y)}" r="4.5"/>`);
    const cx = (f.x0 + f.x1) / 2;
    const cy = (f.y0 + f.y1) / 2;
    const dir = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] }[selItem.facing] ?? [0, 1];
    const half = dir[0] ? (f.x1 - f.x0) / 2 : (f.y1 - f.y0) / 2;
    const [ex, ey] = P(cx + dir[0] * (half + e), cy + dir[1] * (half + e));
    const [rx, ry] = P(cx + dir[0] * (half + 0.5), cy + dir[1] * (half + 0.5));
    out.push(
      `<line class="sel-stem" x1="${r1(ex)}" y1="${r1(ey)}" x2="${r1(rx)}" y2="${r1(ry)}"/>`,
    );
    out.push(`<circle class="sel-rotate" cx="${r1(rx)}" cy="${r1(ry)}" r="7"/></g>`);
  }

  // Wände und Möbel in Zeichenreihenfolge
  out.push('<g class="solids">');
  for (const b of sortBoxes(all, P)) {
    const cls = ['b', ...b.mat.split(' ').map((m, i) => (i === 0 ? `m-${m}` : m))];
    if (b.blob) cls.push('blob');
    if (b.item) cls.push('it', `it-${b.item}`);
    if (b.item && b.item === selected) cls.push('is-sel');
    out.push(
      `<g class="${cls.join(' ')}"${b.item ? ` data-item="${b.item}"` : ''}>${boxMarkup(b, P, sides)}</g>`,
    );
  }
  out.push('</g>');

  // Raumbeschriftungen
  out.push('<g class="labels">');
  for (const r of rooms) {
    const [lx, ly] = P(r.label[0], r.label[1]);
    out.push(
      `<g class="label label-${r.id}" data-room="${r.id}" transform="translate(${r1(lx)} ${r1(ly)})"><g class="label-in"><rect class="label-bg" rx="0"/><text text-anchor="middle"><tspan class="label-name" x="0">${esc(r.name)}</tspan><tspan class="label-area" x="0" dy="1.45em">${formatArea(roomArea(r))}</tspan></text></g></g>`,
    );
  }
  out.push('</g>');

  // Maße am ausgewählten Möbel
  if (selItem && !plan) {
    const f = itemFootprint(selItem);
    const zt = f.z1 + 0.16;
    const alongX = f.x1 - f.x0 >= f.y1 - f.y0;
    const a = alongX ? [f.x0, f.y0, zt] : [f.x0, f.y0, zt];
    const b = alongX ? [f.x1, f.y0, zt] : [f.x0, f.y1, zt];
    const length = Math.round((alongX ? f.x1 - f.x0 : f.y1 - f.y0) * 100);
    const lines = [
      { from: a, to: b, label: `${length} cm`, cls: 'dim-size' },
      ...(selItem.gaps ?? []).map((g) => ({ ...g, cls: 'dim-gap' })),
    ];
    out.push('<g class="dims">');
    for (const ln of lines) {
      const [ax, ay] = P(...ln.from);
      const [bx, by] = P(...ln.to);
      const [atx, aty] = P(ln.from[0], ln.from[1], ln.from[2] + 0.09);
      const [abx, aby] = P(ln.from[0], ln.from[1], ln.from[2] - 0.09);
      const [btx, bty] = P(ln.to[0], ln.to[1], ln.to[2] + 0.09);
      const [bbx, bby] = P(ln.to[0], ln.to[1], ln.to[2] - 0.09);
      out.push(
        `<g class="dim ${ln.cls}"><line x1="${r1(ax)}" y1="${r1(ay)}" x2="${r1(bx)}" y2="${r1(by)}"/><line class="tick" x1="${r1(atx)}" y1="${r1(aty)}" x2="${r1(abx)}" y2="${r1(aby)}"/><line class="tick" x1="${r1(btx)}" y1="${r1(bty)}" x2="${r1(bbx)}" y2="${r1(bby)}"/>`,
      );
      out.push(
        `<g class="dim-label" transform="translate(${r1((ax + bx) / 2)} ${r1((ay + by) / 2)})"><rect/><text text-anchor="middle" dominant-baseline="central">${esc(ln.label)}</text></g></g>`,
      );
    }
    out.push('</g>');
  }

  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.innerHTML = out.join('');

  // Eigene Farben (z. B. gewählter Bezug) per CSSOM setzen
  for (const [itemId, value] of Object.entries(colors)) {
    for (const g of svg.querySelectorAll(
      `.it-${CSS.escape(itemId)}.m-fabric, .it-${CSS.escape(itemId)}.m-fabric2`,
    )) {
      g.style.setProperty('--c', value);
    }
  }

  fitDecorations(svg, s, cs);

  return {
    scale: s,
    itemRect(id) {
      const item = items.find((it) => it.id === id);
      if (!item) return null;
      const f = itemFootprint(item);
      let r = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
      for (const b of [...item.parts, ...(item.blobs ?? []).map(blobBox)]) {
        const q = screenBounds(b, P);
        r = {
          x0: Math.min(r.x0, q.x0),
          y0: Math.min(r.y0, q.y0),
          x1: Math.max(r.x1, q.x1),
          y1: Math.max(r.y1, q.y1),
        };
      }
      const [ax, ay] = P((f.x0 + f.x1) / 2, (f.y0 + f.y1) / 2, f.z1);
      return { ...r, ax, ay };
    },
  };
}

/** Beschriftungen nach dem Einfügen vermessen: Hintergründe und Größe der Bodenschrift. */
function fitDecorations(svg, s, cs) {
  const px = parseFloat(cs.getPropertyValue('--label-pad-x')) || 8;
  const py = parseFloat(cs.getPropertyValue('--label-pad-y')) || 4;
  const radius = parseFloat(cs.getPropertyValue('--label-radius')) || 0;
  const layout = cs.getPropertyValue('--label-layout').trim() || 'stack';
  for (const g of svg.querySelectorAll('.label')) {
    const area = g.querySelector('.label-area');
    if (layout === 'row' && area) {
      area.removeAttribute('x');
      area.setAttribute('dy', '0');
      area.setAttribute('dx', '0.6em');
    }
    const text = g.querySelector('text');
    const rect = g.querySelector('rect');
    if (!text || !rect) continue;
    const bb = text.getBBox();
    rect.setAttribute('x', r1(bb.x - px));
    rect.setAttribute('y', r1(bb.y - py));
    rect.setAttribute('width', r1(bb.width + 2 * px));
    rect.setAttribute('height', r1(bb.height + 2 * py));
    rect.setAttribute('rx', String(Math.min(radius, (bb.height + 2 * py) / 2)));
  }
  for (const g of svg.querySelectorAll('.dim-label')) {
    const text = g.querySelector('text');
    const rect = g.querySelector('rect');
    if (!text || !rect) continue;
    const bb = text.getBBox();
    rect.setAttribute('x', r1(bb.x - 6));
    rect.setAttribute('y', r1(bb.y - 2));
    rect.setAttribute('width', r1(bb.width + 12));
    rect.setAttribute('height', r1(bb.height + 4));
    rect.setAttribute('rx', String(Math.min(radius, (bb.height + 4) / 2)));
  }
  // Bodenschrift: so groß, dass das Wort den Raum fast ausfüllt
  for (const t of svg.querySelectorAll('.super')) {
    const room = rooms.find((r) => t.classList.contains(`super-${r.id}`));
    if (!room) continue;
    const long = Math.max(room.x1 - room.x0, room.y1 - room.y0);
    const short = Math.min(room.x1 - room.x0, room.y1 - room.y0);
    const len = t.getComputedTextLength();
    if (!len) continue;
    const size = Math.min((long - 0.5) / len, short * 0.62);
    t.setAttribute('font-size', size.toFixed(3));
  }
  void s;
}
