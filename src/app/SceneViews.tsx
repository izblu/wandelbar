import { useEffect, useId, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import { useStage } from '../ui/stage/stageContext.ts';
import { useApp } from './AppContext.ts';
import type { useDollhouseCamera, usePlanCamera } from './camera.ts';
import { parseHit } from './hits.ts';
import { Dollhouse } from './prototype/DollhouseScene.tsx';
import { PlanScene, type PlanSceneProps, type Selection } from './prototype/PlanScene.tsx';
import { useSceneGestures } from './useSceneGestures.ts';
import type { Point2 } from './viewport.ts';

/** Raster beim Ziehen von Möbeln: 5 cm */
const SNAP = 0.05;
const snap = (value: number) => Math.round(value / SNAP) * SNAP;

/** Pfeiltasten verschieben die Ansicht um so viele Pixel */
const KEY_PAN = 48;

/** Richtung der Pfeiltasten auf dem Bildschirm */
const ARROWS: Record<string, Point2> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

/**
 * Zeiger der Bühne für das Verschieben (Kreuzpfeile). Gehört zur Ansicht, nicht zur Szene:
 * Das 3D aus M3 ersetzt die SVG-Szenen, das Werkzeug bleibt.
 */
function useGrabCursor(ref: RefObject<Element | null>, grab: boolean) {
  useEffect(() => {
    ref.current?.toggleAttribute('data-grab', grab);
  });
}

interface Drag {
  id: string;
  dx: number;
  dy: number;
}

function useFurnitureDrag() {
  const { edit } = useApp();
  const [dragging, setDragging] = useState<Drag | null>(null);
  const current = useRef<Drag | null>(null);
  const start = (id: string) => {
    current.current = { id, dx: 0, dy: 0 };
    setDragging(current.current);
  };
  const move = (dx: number, dy: number) => {
    if (!current.current) return;
    current.current = { ...current.current, dx: snap(dx), dy: snap(dy) };
    setDragging(current.current);
  };
  const end = (commit: boolean) => {
    const drag = current.current;
    current.current = null;
    setDragging(null);
    if (!commit || !drag || (drag.dx === 0 && drag.dy === 0)) return;
    edit((apartment) => ({
      ...apartment,
      furniture: apartment.furniture.map((item) =>
        item.id === drag.id ? { ...item, x: item.x + drag.dx, y: item.y + drag.dy } : item,
      ),
    }));
  };
  return { dragging, start, move, end };
}

type PlanViewProps = Omit<
  PlanSceneProps,
  'apartment' | 'frame' | 'width' | 'height' | 'svgRef' | 'dragging'
> & {
  camera: ReturnType<typeof usePlanCamera>;
  onPick: (selection: Selection | null) => void;
  dragFurniture?: boolean;
  /** Werkzeug Verschieben oder gehaltene Leertaste: Ziehen verschiebt auch über Möbeln */
  grab?: boolean;
  hint: string;
};

/** Draufsicht mit Zoom, Verschieben und Ziehen von Möbeln */
export function PlanView({
  camera,
  onPick,
  dragFurniture = false,
  grab = false,
  hint,
  ...scene
}: PlanViewProps) {
  const { apartment } = useApp();
  const { width, height } = useStage();
  const ref = useRef<SVGSVGElement>(null);
  const hintId = useId();
  const drag = useFurnitureDrag();
  const scale = camera.frame.scale;
  useGrabCursor(ref, grab);

  useSceneGestures(ref, {
    grab,
    onTap: (hit) => {
      onPick(parseHit(hit));
    },
    onItemDragStart: (hit) => {
      const selection = parseHit(hit);
      if (!dragFurniture || selection?.kind !== 'furniture') return false;
      onPick(selection);
      drag.start(selection.id);
      return true;
    },
    onItemDrag: (dx, dy) => {
      drag.move(dx / scale, dy / scale);
    },
    onItemDragEnd: drag.end,
    onPan: camera.pan,
    onZoom: camera.zoomAt,
  });

  if (!apartment) return null;

  const onKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    const arrow = ARROWS[event.key];
    if (!arrow || scene.selection?.kind === 'furniture') return;
    event.preventDefault();
    // Die Ansicht wandert in Pfeilrichtung, die Zeichnung also entgegen
    camera.pan(-arrow[0] * KEY_PAN, -arrow[1] * KEY_PAN);
  };

  return (
    <>
      <PlanScene
        {...scene}
        apartment={apartment}
        frame={camera.frame}
        width={width}
        height={height}
        svgRef={ref}
        dragging={drag.dragging}
        tabIndex={0}
        describedBy={hintId}
        onKeyDown={onKeyDown}
      />
      <p id={hintId} className="wb-visually-hidden">
        {hint}
      </p>
    </>
  );
}

interface DollhouseViewProps {
  camera: ReturnType<typeof useDollhouseCamera>;
  label: string;
  hint: string;
  sunTime: number | null;
  selectedId?: string | null;
  onPick?: (selection: Selection | null) => void;
  dragFurniture?: boolean;
  hitRooms?: boolean;
  /** Werkzeug Verschieben oder gehaltene Leertaste: Ziehen und Pfeiltasten verschieben */
  grab?: boolean;
}

/**
 * Puppenhaus: Ziehen dreht und neigt um die Mitte des sichtbaren Teils der Wohnung. Verschieben
 * mit dem Werkzeug, der Leertaste, rechter Taste, Strg, Umschalt oder zwei Fingern. Dazu Zoomen
 * und Ziehen von Möbeln.
 */
export function DollhouseView({
  camera,
  label,
  hint,
  sunTime,
  selectedId = null,
  onPick,
  dragFurniture = false,
  hitRooms = false,
  grab = false,
}: DollhouseViewProps) {
  const { apartment } = useApp();
  const { width, height } = useStage();
  const ref = useRef<SVGSVGElement>(null);
  const hintId = useId();
  const drag = useFurnitureDrag();
  const { projection } = camera;
  /** Drehpunkt der laufenden Geste: Er bleibt fest, bis der Finger losgelassen wird */
  const pivot = useRef<Point2 | null>(null);
  useGrabCursor(ref, grab);

  useSceneGestures(ref, {
    grab,
    onTap: (hit) => {
      onPick?.(parseHit(hit));
    },
    onItemDragStart: (hit) => {
      const selection = parseHit(hit);
      if (!dragFurniture || selection?.kind !== 'furniture') return false;
      onPick?.(selection);
      drag.start(selection.id);
      return true;
    },
    onItemDrag: (dx, dy) => {
      const [wx, wy] = projection.unprojectDelta(dx, dy);
      drag.move(wx, wy);
    },
    onItemDragEnd: drag.end,
    onPan: (dx, dy, alternate) => {
      if (alternate) {
        // Nach dem Verschieben (auch mit zwei Fingern) gilt ein neuer Drehpunkt
        pivot.current = null;
        camera.pan(dx, dy);
        return;
      }
      pivot.current ??= camera.pivot();
      // Wie angefasst: Das Modell folgt der Hand; nach unten ziehen zeigt mehr von oben
      camera.turn(-dx * 0.35, -dy * 0.25, pivot.current);
    },
    onPanEnd: () => {
      pivot.current = null;
    },
    onZoom: (factor, anchor) => {
      pivot.current = null;
      camera.zoomAt(factor, anchor);
    },
  });

  if (!apartment) return null;

  const shown = drag.dragging
    ? {
        ...apartment,
        furniture: apartment.furniture.map((item) =>
          item.id === drag.dragging?.id
            ? { ...item, x: item.x + drag.dragging.dx, y: item.y + drag.dragging.dy }
            : item,
        ),
      }
    : apartment;

  const onKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    const arrow = ARROWS[event.key];
    if (!arrow || event.altKey || event.ctrlKey || event.metaKey) return;
    // Mit gewähltem Möbel verschieben die Pfeiltasten das Möbel (Einrichten), wie in der Draufsicht
    if (selectedId) return;
    event.preventDefault();
    if (grab || event.shiftKey) {
      camera.pan(-arrow[0] * KEY_PAN, -arrow[1] * KEY_PAN);
    } else {
      // Links und rechts drehen um 15°, hoch und runter neigen um 5°
      camera.turn(-arrow[0] * 15, arrow[1] * 5);
    }
  };

  return (
    <>
      <Dollhouse
        apartment={shown}
        projection={projection}
        width={width}
        height={height}
        label={label}
        sunTime={sunTime}
        selectedId={selectedId}
        hitFurniture={dragFurniture || Boolean(onPick)}
        hitRooms={hitRooms}
        svgRef={ref}
        describedBy={hintId}
        onKeyDown={onKeyDown}
      />
      <p id={hintId} className="wb-visually-hidden">
        {hint}
      </p>
    </>
  );
}
