import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Button, Kbd } from '../ui/index.ts';
import { useStage } from '../ui/stage/stageContext.ts';
import { useApp } from './AppContext.ts';
import type { TourState } from './useTour.ts';

interface TourStep {
  /** Element, das hervorgehoben wird */
  target: string;
  title: string;
  text: (compact: boolean) => ReactNode;
}

const STEPS: readonly TourStep[] = [
  {
    target: '.wb-sun-time',
    title: 'Willkommen in der Lindenstraße 12',
    text: () =>
      'Eine fertig eingerichtete Beispielwohnung. Zieh die Tageszeit und sieh zu, wie die Sonne durch die Fenster wandert. Abends gehen die Lampen an.',
  },
  {
    target: '.wb-step-bar',
    title: 'Vier Schritte bis zum Rundgang',
    text: () =>
      'Grundriss laden, Wände prüfen, einrichten, erleben. Jeder Schritt zeigt nur die Werkzeuge, die du gerade brauchst.',
  },
  {
    target: '.app-project',
    title: 'Jetzt deine eigene Wohnung',
    text: (compact) =>
      compact ? (
        'Tipp auf das Zeichen oben links und wähle „Neue Wohnung aus Grundriss“. Über die Lupe findest du jeden Befehl.'
      ) : (
        <>
          Hier legst du mit deinem Grundriss los. Jeden Befehl findest du mit <Kbd>Strg</Kbd>{' '}
          <Kbd>K</Kbd>.
        </>
      ),
  },
];

/**
 * Einführung in drei Schritten direkt in der Oberfläche. Nicht modal: Das hervorgehobene Element
 * bleibt bedienbar. Esc oder „Überspringen“ beendet sie.
 */
export function Tour({ state }: { state: TourState }) {
  const { step, goTo } = useApp();
  const { layout } = useStage();
  const titleId = useId();
  const ref = useRef<HTMLElement>(null);
  const current = state.index === null ? null : STEPS[state.index];

  // Die Einführung beginnt im Schritt Erleben, dort steht der Tageszeit-Regler
  useEffect(() => {
    if (state.index !== null && step !== 'experience') goTo('experience');
  }, [state.index, step, goTo]);

  // Hervorheben
  useEffect(() => {
    if (!current) return;
    const element = document.querySelector(current.target);
    element?.setAttribute('data-tour-target', '');
    return () => {
      element?.removeAttribute('data-tour-target');
    };
  }, [current, step]);

  // Fokus auf die Karte, damit Bildschirmleser den Text vorlesen
  useEffect(() => {
    if (state.index !== null) ref.current?.focus();
  }, [state.index]);

  if (!current || state.index === null) return null;
  const last = state.index === STEPS.length - 1;

  return (
    <section
      ref={ref}
      className="app-tour"
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      tabIndex={-1}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          state.close();
        }
      }}
    >
      <p className="app-tour-count">
        Einführung · {state.index + 1} von {STEPS.length}
      </p>
      <h2 id={titleId} className="app-tour-title">
        {current.title}
      </h2>
      <p className="app-tour-text">{current.text(layout === 'compact')}</p>
      <div className="app-tour-actions">
        <Button variant="ghost" size="s" onClick={state.close}>
          {last ? 'Schließen' : 'Überspringen'}
        </Button>
        <span className="app-tour-dots" aria-hidden="true">
          {STEPS.map((tourStep, index) => (
            <span key={tourStep.target} data-active={index === state.index || undefined} />
          ))}
        </span>
        <Button variant="primary" size="s" onClick={last ? state.close : state.next}>
          {last ? 'Los geht’s' : 'Weiter'}
        </Button>
      </div>
    </section>
  );
}
