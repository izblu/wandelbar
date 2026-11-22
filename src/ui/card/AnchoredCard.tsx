import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { readDuration, readEasing, readPixels } from '../motion.ts';
import { useStage } from '../stage/stageContext.ts';
import { placeCard, type CardPlacement, type CardTarget } from './placeCard.ts';
import type { CardFrame } from './PropertyCard.tsx';
import './card.css';

interface AnchoredCardProps {
  /** Lage des gewählten Objekts auf der Bühne; ohne Lage steht die Karte oben rechts. */
  target: CardTarget | null;
  /** Wechselt mit der Auswahl; dann erscheint die Karte neu. */
  selectionKey: string;
  id?: string;
  children: (frame: CardFrame) => ReactNode;
}

/** Ohne Objektlage: oben rechts, wie in den Entwürfen */
const FALLBACK_TOP = 120;
const FALLBACK_RIGHT = 32;

/**
 * PC: Die Eigenschaftenkarte schwebt neben dem Objekt, mit einer Spitze, die darauf zeigt.
 * Sie misst sich selbst und rechnet ihre Lage mit `placeCard` neu, wenn sich etwas ändert.
 */
export function AnchoredCard({ target, selectionKey, id, children }: AnchoredCardProps) {
  const ref = useRef<HTMLElement>(null);
  const titleId = useId();
  const bodyId = useId();
  const stage = useStage();
  const [placement, setPlacement] = useState<(CardPlacement & { anchored: boolean }) | null>(null);

  const targetKey = target
    ? [target.x0, target.y0, target.x1, target.y1, target.anchorX, target.anchorY].join()
    : '';

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const place = () => {
      const card = { width: element.offsetWidth, height: element.offsetHeight };
      if (!target) {
        setPlacement({
          left: stage.width - card.width - FALLBACK_RIGHT,
          top: FALLBACK_TOP,
          side: 'right',
          tailY: 0,
          anchored: false,
        });
        return;
      }
      const next = placeCard({
        target,
        card,
        stage,
        gap: readPixels(element, '--card-gap', 40),
        margin: readPixels(element, '--card-margin', 24),
        safeTop: readPixels(element, '--card-safe-top', 92),
        safeBottom: readPixels(element, '--card-safe-bottom', 92),
        safeLeft: readPixels(element, '--card-safe-left', 0),
      });
      setPlacement({ ...next, anchored: true });
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
    // `target` steckt vollständig in `targetKey`; so löst ein neues, gleiches Objekt nichts aus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetKey, stage]);

  // Erscheinen: kurz von unten einblenden, bei reduzierter Bewegung sofort da
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const duration = readDuration(element, '--duration-enter');
    if (duration <= 0) return;
    element.animate(
      [
        { opacity: 0, transform: 'translateY(6px) scale(0.985)' },
        { opacity: 1, transform: 'none' },
      ],
      { duration, easing: readEasing(element, '--ease-standard') },
    );
  }, [selectionKey]);

  const style = {
    left: placement ? `${String(placement.left)}px` : undefined,
    top: placement ? `${String(placement.top)}px` : undefined,
    visibility: placement ? undefined : 'hidden',
    '--tail-y': placement ? `${String(placement.tailY)}px` : undefined,
  } as CSSProperties;

  return (
    <section
      ref={ref}
      id={id}
      className="wb-card"
      aria-labelledby={titleId}
      tabIndex={-1}
      data-side={placement?.anchored ? placement.side : 'none'}
      style={style}
    >
      {children({ titleId, bodyId })}
    </section>
  );
}
