import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CommandSearch,
  icons,
  SearchButton,
  Stage,
  StageStatus,
  StageTop,
  StepBar,
  ThemeToggle,
  type Command,
  type Step,
} from '../ui/index.ts';
import { useHotkeys } from '../ui/hooks/useHotkeys.ts';
import { useTheme } from '../ui/hooks/useTheme.ts';
import { dayPhase } from '../model/sun.ts';
import { AppContext, type AppApi, type LightMode, type ZoomApi } from './AppContext.ts';
import { Notice } from './Notice.tsx';
import { ProjectMenu } from './ProjectMenu.tsx';
import type { Apartment } from './prototype/apartment.ts';
import { furnitureCenter, roomAt } from './prototype/geometry.ts';
import type { Selection } from './prototype/PlanScene.tsx';
import {
  activeProject,
  STEP_LABELS,
  STEP_ORDER,
  stepIndex,
  useProjects,
  type StepId,
} from './projects.ts';
import { BuildStep } from './steps/BuildStep.tsx';
import { ExperienceStep } from './steps/ExperienceStep.tsx';
import { FurnishStep } from './steps/FurnishStep.tsx';
import { PlanStep } from './steps/PlanStep.tsx';
import { Tour } from './Tour.tsx';
import { useTourState } from './useTour.ts';
import type { Orbit, Viewport } from './viewport.ts';

const DEFAULT_ORBIT: Orbit = { yaw: -28, tilt: 50 };

/** Das ist ein Tastendruck in einem Eingabefeld oder in einem offenen Dialog? */
function keyBelongsElsewhere(event: KeyboardEvent): boolean {
  const target = event.target;
  if (
    target instanceof HTMLElement &&
    target.closest('input:not([type="range"]), textarea, select, [contenteditable="true"]')
  ) {
    return true;
  }
  return document.querySelector('dialog[open]:modal') !== null;
}

/**
 * Klickbarer Prototyp der Kernabläufe (MD): Grundriss → Bauen → Einrichten → Erleben an der
 * Beispielwohnung „Lindenstraße 12“. Erkennung und 3D sind gespielt; das Gerüst bleibt.
 */
export function App() {
  const [state, dispatch] = useProjects();
  const project = activeProject(state);
  const apartment = project.apartment;
  // Jede Wohnung merkt sich ihren Schritt; ein Wechsel führt dorthin zurück
  const step = project.step;
  const [selection, setSelection] = useState<Selection | null>(null);
  const [light, setLight] = useState<LightMode>('sun');
  const [sunTime, setSunTimeState] = useState(16.5);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notice, setNotice] = useState<{ text: string; key: number } | null>(null);
  const [planViewport, setPlanViewport] = useState<Viewport | null>(null);
  const [dollViewport, setDollViewport] = useState<Viewport | null>(null);
  const [orbit, setOrbit] = useState<Orbit>(DEFAULT_ORBIT);
  const zoomApiRef = useRef<ZoomApi | null>(null);
  const tour = useTourState();
  const { resolved, setPreference } = useTheme();

  const notify = useCallback((text: string) => {
    setNotice((previous) => ({ text, key: (previous?.key ?? 0) + 1 }));
  }, []);

  // Nur der Wahrheitswert: Die Wohnung selbst kann der Compiler nicht als unverändert erkennen
  const hasApartment = apartment !== null;
  const goTo = useCallback(
    (next: StepId) => {
      if (next !== 'plan' && !hasApartment) {
        notify('Lade zuerst einen Grundriss, dann geht es mit Bauen weiter.');
        return;
      }
      setSelection(null);
      dispatch({ type: 'open', step: next });
    },
    [hasApartment, dispatch, notify, setSelection],
  );

  const fitView = useCallback(() => {
    zoomApiRef.current?.fit();
  }, []);

  const setSunTime = useCallback(
    (hours: number) => {
      setSunTimeState(hours);
      setLight('sun');
    },
    [setLight],
  );

  const edit = useCallback(
    (update: (current: Apartment) => Apartment, merge?: string) => {
      dispatch({ type: 'edit', update, merge });
    },
    [dispatch],
  );

  // Neue Wohnung oder Wechsel: Ansicht einpassen, Auswahl aufheben
  const projectKey = `${state.active}:${apartment ? 'da' : 'leer'}`;
  const [shownProjectKey, setShownProjectKey] = useState(projectKey);
  if (shownProjectKey !== projectKey) {
    setShownProjectKey(projectKey);
    setPlanViewport(null);
    setDollViewport(null);
    setSelection(null);
  }

  useHotkeys({
    'mod+z': () => {
      dispatch({ type: 'undo' });
    },
    'mod+shift+z': () => {
      dispatch({ type: 'redo' });
    },
    'mod+y': () => {
      dispatch({ type: 'redo' });
    },
  });

  // Zoom mit Plus, Minus und 0. Strg+Plus bleibt der Zoom des Browsers (Barrierefreiheit).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
      if (keyBelongsElsewhere(event)) return;
      const api = zoomApiRef.current;
      if (!api) return;
      if (event.key === '+') api.zoomIn();
      else if (event.key === '-') api.zoomOut();
      else if (event.key === '0') api.fit();
      else return;
      event.preventDefault();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const steps: Step[] = STEP_ORDER.map((id) => ({
    id,
    label: STEP_LABELS[id],
    status:
      id === step ? 'current' : stepIndex(id) <= stepIndex(project.reached) ? 'done' : 'upcoming',
  }));

  /** Licht aus der Suche: Grundriss und Bauen zeigen kein Licht, dann geht es nach Erleben */
  const showLight = (hours: number | null) => {
    if (hours === null) setLight('plan');
    else setSunTime(hours);
    if (step === 'plan' || step === 'build') goTo('experience');
  };

  // Befehle der Suche: bei jedem Rendern neu, das Filtern über gut 40 Einträge ist billig
  const list: Command[] = STEP_ORDER.map((id) => ({
    id: `step-${id}`,
    label: `Zu ${STEP_LABELS[id]}`,
    group: 'Schritte',
    icon: icons.next,
    keywords: [STEP_LABELS[id]],
    run: () => {
      goTo(id);
    },
  }));
  if (apartment) {
    list.push(
      ...apartment.furniture.map((item) => ({
        id: `item-${item.id}`,
        label: item.name,
        group: 'Möbel',
        icon: item.kind === 'lamp' ? icons.lamp : icons.furniture,
        meta: roomAt(apartment.rooms, furnitureCenter(item))?.name,
        run: () => {
          dispatch({ type: 'open', step: 'furnish' });
          setSelection({ kind: 'furniture', id: item.id });
        },
      })),
      ...apartment.rooms.map((room) => ({
        id: `room-${room.id}`,
        label: room.name,
        group: 'Räume',
        icon: icons.room,
        keywords: ['Raum', 'Zimmer'],
        run: () => {
          dispatch({ type: 'open', step: 'build' });
          setSelection({ kind: 'room', id: room.id });
        },
      })),
    );
  }
  list.push(
    {
      id: 'light-morning',
      label: 'Morgenlicht zeigen',
      group: 'Licht',
      icon: icons.sun,
      meta: '8:00 Uhr',
      keywords: ['Sonne', 'Morgen'],
      run: () => {
        showLight(8);
      },
    },
    {
      id: 'light-afternoon',
      label: 'Nachmittagslicht zeigen',
      group: 'Licht',
      icon: icons.sun,
      meta: '16:30 Uhr',
      keywords: ['Sonne', 'Mittag'],
      run: () => {
        showLight(16.5);
      },
    },
    {
      id: 'light-evening',
      label: 'Abendlicht zeigen',
      group: 'Licht',
      icon: icons.lamp,
      meta: '21:30 Uhr',
      keywords: ['Lampen', 'Nacht'],
      run: () => {
        showLight(21.5);
      },
    },
    {
      id: 'light-plan',
      label: 'Planungslicht',
      group: 'Licht',
      icon: icons.sun,
      meta: 'gleichmäßig, ohne Sonne',
      keywords: ['neutral', 'Licht'],
      run: () => {
        showLight(null);
      },
    },
    {
      id: 'new-own',
      label: 'Neue Wohnung aus Grundriss',
      group: 'Wohnung',
      icon: icons.upload,
      keywords: ['Projekt', 'hochladen', 'PDF', 'Bild'],
      run: () => {
        dispatch({ type: 'newOwn' });
      },
    },
    {
      id: 'sample',
      label: 'Beispielwohnung öffnen',
      group: 'Wohnung',
      icon: icons.dollhouse,
      meta: 'Lindenstraße 12',
      run: () => {
        dispatch({ type: 'switch', id: 'sample' });
      },
    },
    {
      id: 'undo',
      label: 'Rückgängig',
      group: 'Befehle',
      icon: icons.undo,
      hotkey: 'mod+z',
      run: () => {
        dispatch({ type: 'undo' });
      },
    },
    // Falscher Alarm: `run` liest den Ref erst, wenn jemand den Befehl in der Suche wählt
    // eslint-disable-next-line react-hooks/refs
    {
      id: 'fit',
      label: 'Ganze Wohnung zeigen',
      group: 'Befehle',
      icon: icons.fit,
      keywords: ['Einpassen', 'Zoom'],
      run: fitView,
    },
    {
      id: 'theme',
      label: resolved === 'dark' ? 'Helles Design' : 'Dunkles Design',
      group: 'Befehle',
      icon: resolved === 'dark' ? icons.sun : icons.moon,
      keywords: ['Thema', 'Farben'],
      run: () => {
        setPreference(resolved === 'dark' ? 'light' : 'dark');
      },
    },
    {
      id: 'tour',
      label: 'Einführung zeigen',
      group: 'Hilfe',
      icon: icons.help,
      keywords: ['Hilfe', 'Tour', 'Anleitung'],
      run: tour.start,
    },
  );
  const commands = list;

  const api: AppApi = {
    state,
    project,
    apartment,
    dispatch,
    edit,
    step,
    goTo,
    selection,
    select: setSelection,
    light,
    setLight,
    sunTime,
    setSunTime,
    notify,
    openSearch: () => {
      setSearchOpen(true);
    },
    startTour: tour.start,
    planViewport,
    setPlanViewport,
    dollViewport,
    setDollViewport,
    orbit,
    setOrbit,
    zoomApiRef,
  };

  const phase = light === 'sun' ? dayPhase(sunTime) : 'day';

  return (
    <AppContext value={api}>
      <a className="wb-skip-link" href="#app-tools">
        Zu den Werkzeugen springen
      </a>
      <Stage className="app-stage" phase={phase} data-step={step}>
        <h1 className="wb-visually-hidden">Wandelbar</h1>
        <StageTop>
          <ProjectMenu />
          <StepBar
            steps={steps}
            onSelect={(id) => {
              goTo(id as StepId);
            }}
          />
          <div className="app-top-actions">
            <SearchButton
              onClick={() => {
                setSearchOpen(true);
              }}
            />
            <ThemeToggle />
          </div>
        </StageTop>

        {step === 'plan' && <PlanStep />}
        {step === 'build' && <BuildStep />}
        {step === 'furnish' && <FurnishStep />}
        {step === 'experience' && <ExperienceStep />}

        <StageStatus>
          <p className="app-prototype-note">
            <span className="app-prototype-dot" aria-hidden="true" />
            Prototyp: Änderungen werden nicht gespeichert
          </p>
        </StageStatus>

        <Notice notice={notice} />
        <Tour state={tour} />
      </Stage>
      <CommandSearch open={searchOpen} onOpenChange={setSearchOpen} commands={commands} />
    </AppContext>
  );
}
