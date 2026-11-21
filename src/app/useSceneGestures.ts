import { useEffect, useRef, type RefObject } from 'react';
import type { Point2 } from './viewport.ts';

/**
 * Zeiger auf der Bühne: Tippen, Ziehen eines Objekts, Verschieben der Ansicht, Zoomen mit
 * Mausrad und zwei Fingern. Ein Objekt ist ein Element mit `data-hit="art:id"`.
 *
 * Belegung wie bei `OrbitControls` (three.js): linke Taste und ein Finger ziehen (im Puppenhaus:
 * drehen); rechte oder mittlere Taste, Strg, Umschalt und zwei Finger verschieben (`alternate`).
 */

export interface GestureHandlers {
  onTap?: (hit: string | null, point: Point2) => void;
  /** true: der Zug bewegt das Objekt; sonst verschiebt er die Ansicht */
  onItemDragStart?: (hit: string, point: Point2) => boolean;
  /** Strecke seit dem Beginn in Pixeln */
  onItemDrag?: (dx: number, dy: number) => void;
  onItemDragEnd?: (commit: boolean) => void;
  /**
   * Ziehen seit dem letzten Aufruf. `alternate` bei rechter oder mittlerer Taste, Strg,
   * Umschalt, zwei Fingern oder mit `grab`: Dann ist es immer Verschieben, auch über Objekten.
   */
  onPan?: (dx: number, dy: number, alternate: boolean) => void;
  /** Ein Ziehen der Ansicht (auch mit zwei Fingern) ist zu Ende */
  onPanEnd?: () => void;
  onZoom?: (factor: number, anchor: Point2) => void;
  /** Werkzeug Verschieben oder gehaltene Leertaste: Ziehen verschiebt, Tippen wählt weiter aus */
  grab?: boolean;
}

/** Ab dieser Strecke ist es Ziehen, darunter Tippen */
const DRAG_THRESHOLD = 5;

interface Track {
  start: Point2;
  last: Point2;
  hit: string | null;
  alternate: boolean;
  /** Linke Taste, Finger oder Stift; nur damit wird getippt */
  primary: boolean;
}

type Mode = 'idle' | 'item' | 'pan' | 'pinch';

function local(element: Element, event: { clientX: number; clientY: number }): Point2 {
  const rect = element.getBoundingClientRect();
  return [event.clientX - rect.left, event.clientY - rect.top];
}

function hitOf(target: EventTarget | null): string | null {
  return target instanceof Element
    ? (target.closest('[data-hit]')?.getAttribute('data-hit') ?? null)
    : null;
}

export function useSceneGestures(ref: RefObject<Element | null>, handlers: GestureHandlers): void {
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const pointers = new Map<number, Track>();
    let mode: Mode = 'idle';
    let pinch: { distance: number; mid: Point2 } | null = null;

    const pinchState = (): { distance: number; mid: Point2 } | null => {
      const [a, b] = [...pointers.values()];
      if (!a || !b) return null;
      return {
        distance: Math.hypot(a.last[0] - b.last[0], a.last[1] - b.last[1]),
        mid: [(a.last[0] + b.last[0]) / 2, (a.last[1] + b.last[1]) / 2],
      };
    };

    const onPointerDown = (event: Event) => {
      if (!(event instanceof PointerEvent)) return;
      // 0 links (auch Finger und Stift), 1 Mitte, 2 rechts; weitere Tasten gehören dem Browser
      if (event.button > 2) return;
      const primary = event.button === 0;
      const point = local(element, event);
      pointers.set(event.pointerId, {
        start: point,
        last: point,
        hit: primary ? hitOf(event.target) : null,
        alternate:
          !primary ||
          event.shiftKey ||
          event.ctrlKey ||
          event.metaKey ||
          handlersRef.current.grab === true,
        primary,
      });
      try {
        element.setPointerCapture(event.pointerId);
      } catch {
        // Zeiger schon weg (z. B. sehr kurzes Tippen): nichts zu fangen
      }
      if (pointers.size === 2) {
        const h = handlersRef.current;
        if (mode === 'item') h.onItemDragEnd?.(false);
        if (mode === 'pan') h.onPanEnd?.();
        mode = 'pinch';
        pinch = pinchState();
      }
      // Kein Einfügen per mittlerer Taste, kein Rollen
      if (!primary) event.preventDefault();
    };

    /** Rechte Taste verschiebt; das Kontextmenü käme dabei in die Quere */
    const onContextMenu = (event: Event) => {
      event.preventDefault();
    };

    const onPointerMove = (event: Event) => {
      if (!(event instanceof PointerEvent)) return;
      const track = pointers.get(event.pointerId);
      if (!track) return;
      const point = local(element, event);
      const previous = track.last;
      track.last = point;
      const h = handlersRef.current;

      if (mode === 'pinch') {
        const next = pinchState();
        if (next && pinch) {
          if (pinch.distance > 0) h.onZoom?.(next.distance / pinch.distance, next.mid);
          h.onPan?.(next.mid[0] - pinch.mid[0], next.mid[1] - pinch.mid[1], true);
        }
        pinch = next;
        return;
      }

      if (mode === 'idle') {
        const moved = Math.hypot(point[0] - track.start[0], point[1] - track.start[1]);
        if (moved < DRAG_THRESHOLD) return;
        mode =
          track.hit && !track.alternate && h.onItemDragStart?.(track.hit, track.start)
            ? 'item'
            : 'pan';
        if (mode === 'pan') {
          h.onPan?.(point[0] - track.start[0], point[1] - track.start[1], track.alternate);
          return;
        }
      }

      if (mode === 'item') {
        h.onItemDrag?.(point[0] - track.start[0], point[1] - track.start[1]);
      } else {
        h.onPan?.(point[0] - previous[0], point[1] - previous[1], track.alternate);
      }
    };

    const finish = (event: Event, commit: boolean) => {
      if (!(event instanceof PointerEvent)) return;
      const track = pointers.get(event.pointerId);
      if (!track) return;
      pointers.delete(event.pointerId);
      const h = handlersRef.current;
      if (mode === 'pinch') {
        // Der übrige Finger zieht weiter, aber tippt nicht und greift kein Objekt
        pinch = null;
        if (pointers.size > 0) {
          mode = 'pan';
          return;
        }
        mode = 'idle';
        h.onPanEnd?.();
        return;
      }
      if (mode === 'item') h.onItemDragEnd?.(commit);
      else if (mode === 'idle' && commit && track.primary) h.onTap?.(track.hit, track.start);
      if (pointers.size === 0) {
        if (mode === 'pan') h.onPanEnd?.();
        mode = 'idle';
      }
    };

    const onPointerUp = (event: Event) => {
      finish(event, true);
    };
    const onPointerCancel = (event: Event) => {
      finish(event, false);
    };

    const onWheel = (event: Event) => {
      if (!(event instanceof WheelEvent)) return;
      event.preventDefault();
      const lines = event.deltaMode === 1 ? 33 : event.deltaMode === 2 ? 400 : 1;
      const delta = event.deltaY * lines;
      // Strg + Rad ist auf Touchpads die Zwei-Finger-Geste: feiner auflösen
      const factor = Math.exp(-delta * (event.ctrlKey ? 0.01 : 0.0016));
      handlersRef.current.onZoom?.(factor, local(element, event));
    };

    element.addEventListener('pointerdown', onPointerDown);
    element.addEventListener('pointermove', onPointerMove);
    element.addEventListener('pointerup', onPointerUp);
    element.addEventListener('pointercancel', onPointerCancel);
    element.addEventListener('wheel', onWheel, { passive: false });
    element.addEventListener('contextmenu', onContextMenu);
    return () => {
      element.removeEventListener('pointerdown', onPointerDown);
      element.removeEventListener('pointermove', onPointerMove);
      element.removeEventListener('pointerup', onPointerUp);
      element.removeEventListener('pointercancel', onPointerCancel);
      element.removeEventListener('wheel', onWheel);
      element.removeEventListener('contextmenu', onContextMenu);
    };
  }, [ref]);
}
