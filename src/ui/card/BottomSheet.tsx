import {
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { readDuration, readPixels } from '../motion.ts';
import { resolveSheetTarget, springFrames, type SheetState } from './sheetPhysics.ts';
import type { CardFrame } from './PropertyCard.tsx';
import './card.css';

interface BottomSheetProps {
  /** Wechselt mit der Auswahl; dann gleitet das Blatt neu herein, eingeklappt. */
  selectionKey: string;
  id?: string;
  children: (frame: CardFrame) => ReactNode;
}

/** Erst ab dieser Strecke gilt eine Berührung als Ziehen, darunter als Tippen. */
const DRAG_THRESHOLD = 6;
/** Lag die letzte Bewegung länger zurück, stand der Finger still: Schwung zählt dann nicht. */
const VELOCITY_STALE_MS = 80;

/** Senkrechte Verschiebung aus dem berechneten `translate`, z. B. „0px 123.5px“. */
function translateY(element: HTMLElement): number | null {
  const value = getComputedStyle(element).translate;
  if (value === 'none') return 0;
  const y = Number.parseFloat(value.split(' ')[1] ?? '0');
  return Number.isFinite(y) ? y : null;
}

interface Drag {
  pointerId: number;
  startY: number;
  startOffset: number;
  travel: number;
  offset: number;
  moved: boolean;
  lastY: number;
  lastTime: number;
  velocity: number;
}

/**
 * Handy: Die Eigenschaftenkarte als Blatt von unten. Eingeklappt schaut nur der Kopf mit den
 * Schnellaktionen heraus (`--sheet-peek`). Ein Griff-Knopf klappt auf und zu (auch per Tastatur);
 * am Griff und am Kopf lässt sich das Blatt ziehen und federt nach dem Loslassen an sein Ziel.
 */
export function BottomSheet({ selectionKey, id, children }: BottomSheetProps) {
  const ref = useRef<HTMLElement>(null);
  const handleRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const bodyId = useId();
  const [state, setState] = useState<SheetState>('peek');
  const [shownKey, setShownKey] = useState(selectionKey);
  const drag = useRef<Drag | null>(null);
  const suppressClick = useRef(false);
  /** Laufende Feder; ein neuer Zug oder eine neue Feder bricht sie ab. */
  const spring = useRef<Animation | null>(null);

  const play = useCallback((element: HTMLElement, ...args: Parameters<typeof springFrames>) => {
    const { frames, durationMs } = springFrames(...args);
    spring.current?.cancel();
    spring.current = element.animate(
      frames.map((y) => ({ translate: `0 ${y.toFixed(2)}px` })),
      { duration: durationMs, easing: 'linear' },
    );
  }, []);

  // Neue Auswahl: wieder eingeklappt beginnen (Zustand während des Renderns angleichen)
  if (shownKey !== selectionKey) {
    setShownKey(selectionKey);
    setState('peek');
  }

  const travel = useCallback(() => {
    const element = ref.current;
    if (!element) return 0;
    return Math.max(0, element.offsetHeight - readPixels(element, '--sheet-peek', 178));
  }, []);

  const springTo = useCallback(
    (next: SheetState, from: number, velocity: number) => {
      const element = ref.current;
      if (!element) return;
      const to = next === 'open' ? 0 : travel();
      element.style.removeProperty('translate');
      setState(next);
      if (
        next === 'peek' &&
        element.querySelector('.wb-card-body')?.contains(document.activeElement)
      ) {
        handleRef.current?.focus();
      }
      if (readDuration(element, '--duration-slow') <= 0 || Math.abs(from - to) < 1) {
        spring.current?.cancel();
        spring.current = null;
        return;
      }
      play(element, from, to, velocity);
    },
    [travel, play],
  );

  /** Wo das Blatt gerade steht, auch mitten in einer Feder (Versatz in Pixeln). */
  const currentOffset = (): number => {
    const resting = state === 'open' ? 0 : travel();
    const element = ref.current;
    if (!element || spring.current?.playState !== 'running') return resting;
    return translateY(element) ?? resting;
  };

  // Erscheinen: von ganz unten in die eingeklappte Lage federn
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || readDuration(element, '--duration-slow') <= 0) return;
    play(element, element.offsetHeight, travel(), 0, { damping: 38 });
  }, [selectionKey, travel, play]);

  const toggle = () => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    springTo(state === 'open' ? 'peek' : 'open', currentOffset(), 0);
  };

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    if (!(event.target instanceof Element) || !event.target.closest('[data-sheet-drag]')) return;
    const offset = currentOffset();
    drag.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startOffset: offset,
      travel: travel(),
      offset,
      moved: false,
      lastY: event.clientY,
      lastTime: event.timeStamp,
      velocity: 0,
    };
  };

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const current = drag.current;
    const element = ref.current;
    if (!current || !element || event.pointerId !== current.pointerId) return;
    const dy = event.clientY - current.startY;
    if (!current.moved) {
      if (Math.abs(dy) < DRAG_THRESHOLD) return;
      current.moved = true;
      element.setPointerCapture(event.pointerId);
      element.dataset.dragging = 'true';
      // Eine noch laufende Feder würde das Blatt über den Finger legen
      spring.current?.cancel();
      spring.current = null;
    }
    const dt = event.timeStamp - current.lastTime;
    if (dt > 0) current.velocity = (event.clientY - current.lastY) / dt;
    current.lastY = event.clientY;
    current.lastTime = event.timeStamp;
    current.offset = Math.max(0, Math.min(current.travel, current.startOffset + dy));
    element.style.translate = `0 ${String(current.offset)}px`;
  };

  const endDrag = (event: PointerEvent<HTMLElement>) => {
    const current = drag.current;
    if (current?.pointerId !== event.pointerId) return;
    drag.current = null;
    if (!current.moved) return;
    suppressClick.current = true;
    window.setTimeout(() => {
      suppressClick.current = false;
    }, 0);
    delete ref.current?.dataset.dragging;
    const velocity = event.timeStamp - current.lastTime > VELOCITY_STALE_MS ? 0 : current.velocity;
    springTo(
      resolveSheetTarget(current.offset, velocity, current.travel),
      current.offset,
      velocity,
    );
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape' && state === 'open') {
      event.stopPropagation();
      springTo('peek', currentOffset(), 0);
      handleRef.current?.focus();
    }
  };

  // Nach einem Zug kein Klick auf Knöpfe im Kopf auslösen
  const onClickCapture = (event: MouseEvent<HTMLElement>) => {
    if (suppressClick.current && event.target !== handleRef.current) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  const open = state === 'open';

  return (
    <section
      ref={ref}
      id={id}
      className="wb-card wb-sheet"
      aria-labelledby={titleId}
      tabIndex={-1}
      data-state={state}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={onKeyDown}
      onClickCapture={onClickCapture}
    >
      <button
        ref={handleRef}
        type="button"
        className="wb-sheet-handle"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={toggle}
        data-sheet-drag=""
      >
        <span className="wb-visually-hidden">
          {open ? 'Eigenschaften einklappen' : 'Alle Eigenschaften zeigen'}
        </span>
      </button>
      <div className="wb-sheet-content">
        {children({ titleId, bodyId, bodyInert: !open, draggableHead: true })}
      </div>
    </section>
  );
}
