import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import { cx } from '../cx.ts';
import type { DayPhase } from '../../model/sun.ts';
import { StageContext, layoutForWidth, type StageInfo } from './stageContext.ts';
import './stage.css';

interface StageProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Tag oder Abend: steuert Sonnen- und Lampen-Icons in den Bausteinen. */
  phase?: DayPhase;
}

/** Fläche für Szene und schwebende Bedienung. Misst sich selbst und teilt die Anordnung mit. */
export function Stage({ children, className, phase = 'day', ...rest }: StageProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => {
      const { width, height } = element.getBoundingClientRect();
      setSize((previous) =>
        previous.width === width && previous.height === height ? previous : { width, height },
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);

  const info = useMemo<StageInfo>(
    () => ({ layout: layoutForWidth(size.width), width: size.width, height: size.height }),
    [size],
  );

  return (
    <StageContext value={info}>
      <div
        ref={ref}
        className={cx('wb-stage', className)}
        data-layout={info.layout}
        data-phase={phase}
        {...rest}
      >
        {children}
      </div>
    </StageContext>
  );
}

interface SlotProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

/** Kopfzeile der Bühne: Marke, Schritte, Suche */
export function StageTop({ children, className, ...rest }: SlotProps) {
  return (
    <header className={cx('wb-stage-top', className)} {...rest}>
      {children}
    </header>
  );
}

/** Platz der Werkzeugpalette: links mittig, auf dem Handy unten über der Karte */
export function StageTools({ children, className, ...rest }: SlotProps) {
  return (
    <div className={cx('wb-stage-tools', className)} {...rest}>
      {children}
    </div>
  );
}

/** Platz der Ansichtsleiste: unten mittig, auf dem Handy oben unter der Kopfzeile */
export function StageView({ children, className, ...rest }: SlotProps) {
  return (
    <div className={cx('wb-stage-view', className)} {...rest}>
      {children}
    </div>
  );
}

/** Platz für den Speicherstand: unten links, auf dem Handy ausgeblendet */
export function StageStatus({ children, className, ...rest }: SlotProps) {
  return (
    <div className={cx('wb-stage-status', className)} {...rest}>
      {children}
    </div>
  );
}
