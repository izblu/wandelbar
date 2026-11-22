import { useReducer } from 'react';
import { sampleApartment, type Apartment } from './prototype/apartment.ts';

/**
 * Zustand des Prototyps: die Beispielwohnung und höchstens eine eigene Wohnung, jede mit eigenem
 * Rückgängig-Verlauf. Nichts wird gespeichert; das übernimmt ab M1 der echte Speicher (Dexie).
 */

export type StepId = 'plan' | 'build' | 'furnish' | 'experience';
export const STEP_ORDER: readonly StepId[] = ['plan', 'build', 'furnish', 'experience'];

export const STEP_LABELS: Record<StepId, string> = {
  plan: 'Grundriss',
  build: 'Bauen',
  furnish: 'Einrichten',
  experience: 'Erleben',
};

/** Unterschritte im Schritt Grundriss */
export type PlanStage = 'empty' | 'recognizing' | 'scale' | 'north' | 'done';

export type ProjectId = 'sample' | 'own';

export interface Project {
  id: ProjectId;
  apartment: Apartment | null;
  /** Ergebnis der laufenden Erkennung, bis sie fertig ist */
  pending: Apartment | null;
  planStage: PlanStage;
  /** Erkannte Teile sind noch nicht übernommen (Schritt Bauen) */
  suggestions: boolean;
  /** Zuletzt geöffneter Schritt; beim Wechsel der Wohnung geht es dorthin zurück */
  step: StepId;
  /** Weitester erreichter Schritt */
  reached: StepId;
  past: Apartment[];
  future: Apartment[];
  /**
   * Feld der letzten Änderung, wenn sie mit weiteren Änderungen an diesem Feld zu einem
   * Rückgängig-Schritt zusammenläuft (Tippen im Raumnamen, Drehen am Kompass)
   */
  merging: string | null;
}

export interface ProjectsState {
  active: ProjectId;
  sample: Project;
  own: Project | null;
}

export type ProjectAction =
  /** `merge`: Schlüssel des Felds; Änderungen nacheinander am selben Feld bilden einen Schritt */
  | { type: 'edit'; update: (apartment: Apartment) => Apartment; merge?: string }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'newOwn' }
  | { type: 'switch'; id: ProjectId }
  | { type: 'planStage'; stage: PlanStage }
  | { type: 'recognize'; apartment: Apartment }
  | { type: 'recognized' }
  | { type: 'acceptSuggestions' }
  | { type: 'open'; step: StepId };

const HISTORY_LIMIT = 60;

function sampleProject(): Project {
  return {
    id: 'sample',
    apartment: sampleApartment(),
    pending: null,
    planStage: 'done',
    suggestions: false,
    step: 'experience',
    reached: 'experience',
    past: [],
    future: [],
    merging: null,
  };
}

function updateActive(state: ProjectsState, update: (project: Project) => Project): ProjectsState {
  if (state.active === 'own') return state.own ? { ...state, own: update(state.own) } : state;
  return { ...state, sample: update(state.sample) };
}

export function stepIndex(step: StepId): number {
  return STEP_ORDER.indexOf(step);
}

export function projectsReducer(state: ProjectsState, action: ProjectAction): ProjectsState {
  switch (action.type) {
    case 'edit':
      return updateActive(state, (project) => {
        if (!project.apartment) return project;
        const next = action.update(project.apartment);
        if (next === project.apartment) return project;
        const merge = action.merge ?? null;
        // Weitere Änderung am selben Feld: Der Schritt davor bleibt der Stand vor dem Feld
        if (merge !== null && merge === project.merging) return { ...project, apartment: next };
        return {
          ...project,
          apartment: next,
          past: [...project.past, project.apartment].slice(-HISTORY_LIMIT),
          future: [],
          merging: merge,
        };
      });
    case 'undo':
      return updateActive(state, (project) => {
        const previous = project.past.at(-1);
        if (!previous || !project.apartment) return project;
        return {
          ...project,
          apartment: previous,
          past: project.past.slice(0, -1),
          future: [project.apartment, ...project.future],
          merging: null,
        };
      });
    case 'redo':
      return updateActive(state, (project) => {
        const next = project.future[0];
        if (!next || !project.apartment) return project;
        return {
          ...project,
          apartment: next,
          past: [...project.past, project.apartment],
          future: project.future.slice(1),
          merging: null,
        };
      });
    case 'newOwn':
      return {
        ...state,
        active: 'own',
        own: {
          id: 'own',
          apartment: null,
          pending: null,
          planStage: 'empty',
          suggestions: false,
          step: 'plan',
          reached: 'plan',
          past: [],
          future: [],
          merging: null,
        },
      };
    case 'switch':
      if (action.id === 'own' && !state.own) return state;
      return { ...state, active: action.id };
    case 'planStage':
      return updateActive(state, (project) => ({ ...project, planStage: action.stage }));
    case 'recognize':
      return updateActive(state, (project) => ({
        ...project,
        pending: action.apartment,
        planStage: 'recognizing',
      }));
    case 'recognized':
      return updateActive(state, (project) =>
        project.pending
          ? {
              ...project,
              apartment: project.pending,
              pending: null,
              planStage: 'scale',
              suggestions: true,
              past: [],
              future: [],
              merging: null,
            }
          : project,
      );
    case 'acceptSuggestions':
      return updateActive(state, (project) =>
        project.apartment
          ? {
              ...project,
              suggestions: false,
              merging: null,
              apartment: {
                ...project.apartment,
                openings: project.apartment.openings.map((opening) => ({
                  ...opening,
                  confidence: 1,
                })),
              },
            }
          : project,
      );
    case 'open':
      return updateActive(state, (project) => ({
        ...project,
        step: action.step,
        reached:
          stepIndex(action.step) > stepIndex(project.reached) ? action.step : project.reached,
      }));
  }
}

/** Start: die Beispielwohnung, noch keine eigene */
export function initialProjects(): ProjectsState {
  return { active: 'sample', sample: sampleProject(), own: null };
}

export function useProjects() {
  return useReducer(projectsReducer, undefined, initialProjects);
}

export function activeProject(state: ProjectsState): Project {
  return state.active === 'own' && state.own ? state.own : state.sample;
}
