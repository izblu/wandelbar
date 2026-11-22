import {
  ArrowDown,
  ArrowRight,
  AppWindow,
  ArrowUp,
  Box,
  BrickWall,
  Camera,
  Check,
  ChevronDown,
  CircleHelp,
  Compass,
  Copy,
  CornerDownLeft,
  createLucideIcon,
  DoorOpen,
  Download,
  FileUp,
  Ellipsis,
  Footprints,
  Hand,
  Lamp,
  Info,
  Layers,
  Maximize,
  Minus,
  Moon,
  MousePointer2,
  PaintRoller,
  Plus,
  RotateCw,
  Ruler,
  ScanLine,
  SaveCheck,
  Search,
  Settings,
  ShoppingCart,
  Sofa,
  SquareDashed,
  Sun,
  SunDim,
  Trash2,
  TriangleAlert,
  Undo2,
  Redo2,
  X,
  type LucideIcon,
} from 'lucide-react';

/**
 * Grundriss von oben, im Stil von Lucide gezeichnet (24er-Raster, runde Linien).
 * Lucide hat kein passendes Symbol; dieses stammt aus den Entwürfen (MD).
 */
export const FloorPlan = createLucideIcon('floor-plan', [
  ['rect', { x: '3.5', y: '3.5', width: '17', height: '17', rx: '1.5', key: 'outline' }],
  ['path', { d: 'M3.5 12.5h7v8', key: 'room-left' }],
  ['path', { d: 'M14 3.5v5.5h6.5', key: 'room-top' }],
]);

/**
 * Der Icon-Satz von Wandelbar: ein Name pro Aufgabe, nicht pro Bild.
 * So bleibt ein Werkzeug überall gleich, auch wenn sich das Bild später ändert.
 */
export const icons = {
  // Werkzeuge
  select: MousePointer2,
  pan: Hand,
  furniture: Sofa,
  surfaces: PaintRoller,
  measure: Ruler,
  wall: BrickWall,
  door: DoorOpen,
  window: AppWindow,
  room: SquareDashed,
  undo: Undo2,
  redo: Redo2,

  // Ansicht und Licht
  dollhouse: Box,
  floorPlan: FloorPlan,
  walk: Footprints,
  zoomIn: Plus,
  zoomOut: Minus,
  fit: Maximize,
  north: Compass,
  photo: Camera,
  sun: Sun,
  planLight: SunDim,
  moon: Moon,
  lamp: Lamp,

  // Aktionen am Objekt
  rotate: RotateCw,
  duplicate: Copy,
  remove: Trash2,
  more: Ellipsis,

  // Allgemein
  upload: FileUp,
  recognize: ScanLine,
  info: Info,
  search: Search,
  check: Check,
  close: X,
  chevronDown: ChevronDown,
  next: ArrowRight,
  variants: Layers,
  shoppingList: ShoppingCart,
  saved: SaveCheck,
  export: Download,
  settings: Settings,
  help: CircleHelp,
  warning: TriangleAlert,

  // Tasten in Hinweisen
  keyUp: ArrowUp,
  keyDown: ArrowDown,
  keyEnter: CornerDownLeft,
} as const satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof icons;
