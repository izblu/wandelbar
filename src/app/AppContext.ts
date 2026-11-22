import {
  createContext,
  useContext,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from 'react';
import type { Apartment } from './prototype/apartment.ts';
import type { Selection } from './prototype/PlanScene.tsx';
import type { Project, ProjectAction, ProjectsState, StepId } from './projects.ts';
import type { Orbit, Viewport } from './viewport.ts';

/** Planungslicht (gleichmäßig) oder Sonne nach Uhrzeit */
export type LightMode = 'plan' | 'sun';

/** Zoom-Befehle der gerade sichtbaren Ansicht, für Tasten und Suche */
export interface ZoomApi {
  zoomIn: () => void;
  zoomOut: () => void;
  fit: () => void;
}

export interface AppApi {
  state: ProjectsState;
  project: Project;
  apartment: Apartment | null;
  dispatch: Dispatch<ProjectAction>;
  /** `merge`: Schlüssel des Felds; Änderungen nacheinander am selben Feld bilden einen Schritt */
  edit: (update: (apartment: Apartment) => Apartment, merge?: string) => void;
  step: StepId;
  goTo: (step: StepId) => void;
  selection: Selection | null;
  select: (selection: Selection | null) => void;
  light: LightMode;
  setLight: (mode: LightMode) => void;
  sunTime: number;
  setSunTime: (hours: number) => void;
  notify: (message: string) => void;
  openSearch: () => void;
  startTour: () => void;
  /** null = eingepasst */
  planViewport: Viewport | null;
  setPlanViewport: Dispatch<SetStateAction<Viewport | null>>;
  dollViewport: Viewport | null;
  setDollViewport: Dispatch<SetStateAction<Viewport | null>>;
  orbit: Orbit;
  setOrbit: Dispatch<SetStateAction<Orbit>>;
  zoomApiRef: RefObject<ZoomApi | null>;
}

export const AppContext = createContext<AppApi | null>(null);

export function useApp(): AppApi {
  const api = useContext(AppContext);
  if (!api) throw new Error('useApp braucht den AppContext.');
  return api;
}
