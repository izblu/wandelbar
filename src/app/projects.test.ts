import { describe, expect, it } from 'vitest';
import {
  activeProject,
  initialProjects,
  projectsReducer,
  STEP_ORDER,
  stepIndex,
  type ProjectAction,
  type ProjectsState,
} from './projects.ts';
import { recognizedApartment, type Apartment } from './prototype/apartment.ts';

/** Benennt die Wohnung um: eine Änderung, die man leicht wiedererkennt */
const rename = (name: string): ProjectAction => ({
  type: 'edit',
  update: (apartment: Apartment) => ({ ...apartment, name }),
});

function run(state: ProjectsState, ...actions: ProjectAction[]): ProjectsState {
  return actions.reduce(projectsReducer, state);
}

const nameOf = (state: ProjectsState) => activeProject(state).apartment?.name;

describe('initialProjects', () => {
  it('startet mit der fertigen Beispielwohnung im Schritt Erleben, ohne eigene Wohnung', () => {
    const state = initialProjects();
    expect(state.active).toBe('sample');
    expect(state.own).toBeNull();
    const project = activeProject(state);
    expect(project).toBe(state.sample);
    expect(project.apartment?.name).toBe('Lindenstraße 12');
    expect(project.apartment?.furniture.length).toBeGreaterThan(0);
    expect(project).toMatchObject({
      pending: null,
      planStage: 'done',
      suggestions: false,
      reached: 'experience',
      past: [],
      future: [],
    });
  });

  it('gibt jedes Mal eine frische Wohnung heraus', () => {
    const first = initialProjects();
    const second = initialProjects();
    expect(first.sample.apartment).not.toBe(second.sample.apartment);
    expect(first.sample.apartment).toEqual(second.sample.apartment);
  });
});

describe('Bearbeiten, Rückgängig und Wiederholen', () => {
  it('merkt sich jede Änderung und nimmt sie zurück', () => {
    const edited = run(initialProjects(), rename('A'), rename('B'));
    expect(nameOf(edited)).toBe('B');
    expect(activeProject(edited).past).toHaveLength(2);

    const undone = run(edited, { type: 'undo' });
    expect(nameOf(undone)).toBe('A');
    expect(nameOf(run(undone, { type: 'undo' }))).toBe('Lindenstraße 12');

    const redone = run(undone, { type: 'redo' });
    expect(nameOf(redone)).toBe('B');
    expect(activeProject(redone).future).toEqual([]);
  });

  it('verwirft das Wiederholen nach einer neuen Änderung', () => {
    const state = run(initialProjects(), rename('A'), { type: 'undo' }, rename('C'));
    expect(nameOf(state)).toBe('C');
    expect(activeProject(state).future).toEqual([]);
    expect(run(state, { type: 'redo' })).toEqual(state);
  });

  it('ändert nichts ohne Verlauf oder bei einer Änderung, die nichts ändert', () => {
    const state = initialProjects();
    expect(run(state, { type: 'undo' })).toEqual(state);
    expect(run(state, { type: 'redo' })).toEqual(state);
    const unchanged = run(state, { type: 'edit', update: (apartment) => apartment });
    expect(activeProject(unchanged).past).toEqual([]);
  });

  describe('ein Schritt pro Feld', () => {
    /** Tippen in einem Feld: jede Änderung trägt den Schlüssel des Felds */
    const type = (name: string, merge = 'room-name:kitchen'): ProjectAction => ({
      type: 'edit',
      update: (apartment: Apartment) => ({ ...apartment, name }),
      merge,
    });

    it('fasst Änderungen mit demselben Feldschlüssel zu einem Rückgängig-Schritt zusammen', () => {
      const state = run(initialProjects(), type('W'), type('Wo'), type('Wohnküche'));
      // Die Vorschau zeigt immer den letzten Stand
      expect(nameOf(state)).toBe('Wohnküche');
      expect(activeProject(state).past).toHaveLength(1);

      const undone = run(state, { type: 'undo' });
      expect(nameOf(undone)).toBe('Lindenstraße 12');
      expect(activeProject(undone).past).toEqual([]);
      expect(nameOf(run(undone, { type: 'redo' }))).toBe('Wohnküche');
    });

    it('beginnt mit einem anderen Feld einen neuen Schritt', () => {
      const state = run(initialProjects(), type('A'), type('AB'), type('C', 'north'));
      expect(activeProject(state).past).toHaveLength(2);
      expect(nameOf(run(state, { type: 'undo' }))).toBe('AB');
    });

    it('beginnt nach einer Änderung ohne Feldschlüssel einen neuen Schritt', () => {
      const state = run(initialProjects(), type('A'), rename('B'), type('BC'));
      expect(activeProject(state).past).toHaveLength(3);
      expect(nameOf(run(state, { type: 'undo' }))).toBe('B');
    });

    it('beginnt nach Rückgängig einen neuen Schritt, auch am selben Feld', () => {
      const state = run(
        initialProjects(),
        type('A', 'north'),
        type('B'),
        { type: 'undo' },
        type('C'),
      );
      expect(nameOf(state)).toBe('C');
      // Der Stand vor dem Rückgängig bleibt erreichbar: zurück zu A, dann zum Anfang
      const once = run(state, { type: 'undo' });
      expect(nameOf(once)).toBe('A');
      expect(nameOf(run(once, { type: 'undo' }))).toBe('Lindenstraße 12');
    });

    it('beginnt nach Wiederholen einen neuen Schritt, auch am selben Feld', () => {
      const state = run(
        initialProjects(),
        type('A', 'north'),
        type('B'),
        { type: 'undo' },
        { type: 'redo' },
        type('BC'),
      );
      expect(nameOf(state)).toBe('BC');
      expect(activeProject(state).past).toHaveLength(3);
      expect(nameOf(run(state, { type: 'undo' }))).toBe('B');
    });
  });

  it('behält höchstens 60 Schritte im Verlauf', () => {
    const edits = Array.from({ length: 70 }, (_, index) => rename(`Name ${String(index)}`));
    const state = run(initialProjects(), ...edits);
    const { past } = activeProject(state);
    expect(past).toHaveLength(60);
    // Die ältesten fallen heraus
    expect(past[0]?.name).toBe('Name 9');
  });
});

describe('Eigene Wohnung', () => {
  it('legt eine leere eigene Wohnung an und wechselt zu ihr', () => {
    const state = run(initialProjects(), { type: 'newOwn' });
    expect(state.active).toBe('own');
    expect(activeProject(state)).toMatchObject({
      id: 'own',
      apartment: null,
      planStage: 'empty',
      reached: 'plan',
      suggestions: false,
    });
    // Ohne Wohnung lässt sich nichts bearbeiten
    expect(run(state, rename('X'))).toEqual(state);
  });

  it('wechselt nur zur eigenen Wohnung, wenn es sie gibt', () => {
    const state = initialProjects();
    expect(run(state, { type: 'switch', id: 'own' })).toBe(state);
    const withOwn = run(state, { type: 'newOwn' }, { type: 'switch', id: 'sample' });
    expect(withOwn.active).toBe('sample');
    expect(run(withOwn, { type: 'switch', id: 'own' }).active).toBe('own');
  });

  it('führt durch Erkennung, Maßstab und Norden', () => {
    const recognized = recognizedApartment('Meine Wohnung', 'plan.pdf');
    let state = run(
      initialProjects(),
      { type: 'newOwn' },
      {
        type: 'recognize',
        apartment: recognized,
      },
    );
    expect(activeProject(state)).toMatchObject({
      apartment: null,
      pending: recognized,
      planStage: 'recognizing',
    });

    state = run(state, { type: 'recognized' });
    expect(activeProject(state)).toMatchObject({
      apartment: recognized,
      pending: null,
      planStage: 'scale',
      suggestions: true,
      past: [],
    });

    state = run(state, { type: 'planStage', stage: 'north' }, { type: 'planStage', stage: 'done' });
    expect(activeProject(state).planStage).toBe('done');
  });

  it('übernimmt die Erkennung erst, wenn sie fertig ist', () => {
    const state = run(initialProjects(), { type: 'newOwn' });
    expect(run(state, { type: 'recognized' })).toEqual(state);
  });

  it('macht beim Übernehmen alle unsicheren Stellen sicher', () => {
    const recognized = recognizedApartment('Meine Wohnung', 'plan.pdf');
    expect(recognized.openings.some((opening) => opening.confidence < 0.7)).toBe(true);
    const state = run(
      initialProjects(),
      { type: 'newOwn' },
      { type: 'recognize', apartment: recognized },
      { type: 'recognized' },
      { type: 'acceptSuggestions' },
    );
    const project = activeProject(state);
    expect(project.suggestions).toBe(false);
    expect(project.apartment?.openings.every((opening) => opening.confidence === 1)).toBe(true);
    expect(project.apartment?.openings).toHaveLength(recognized.openings.length);
  });

  it('hält Verlauf und Stand beider Wohnungen getrennt', () => {
    const state = run(
      initialProjects(),
      rename('Geändertes Beispiel'),
      { type: 'newOwn' },
      { type: 'recognize', apartment: recognizedApartment('Meine Wohnung', 'plan.pdf') },
      { type: 'recognized' },
      rename('Meine neue Wohnung'),
      { type: 'undo' },
    );
    expect(nameOf(state)).toBe('Meine Wohnung');
    expect(state.sample.apartment?.name).toBe('Geändertes Beispiel');
    expect(state.sample.past).toHaveLength(1);
    // Zurück zum Beispiel: Dort nimmt Rückgängig nur die eigene Änderung zurück
    const sample = run(state, { type: 'switch', id: 'sample' }, { type: 'undo' });
    expect(nameOf(sample)).toBe('Lindenstraße 12');
    expect(sample.own?.apartment?.name).toBe('Meine Wohnung');
  });
});

describe('Schritte', () => {
  it('kennt die Reihenfolge Grundriss, Bauen, Einrichten, Erleben', () => {
    expect(STEP_ORDER).toEqual(['plan', 'build', 'furnish', 'experience']);
    expect(STEP_ORDER.map(stepIndex)).toEqual([0, 1, 2, 3]);
  });

  it('merkt sich nur den weitesten erreichten Schritt', () => {
    let state = run(initialProjects(), { type: 'newOwn' }, { type: 'open', step: 'furnish' });
    expect(activeProject(state).reached).toBe('furnish');
    state = run(state, { type: 'open', step: 'build' });
    expect(activeProject(state).reached).toBe('furnish');
    state = run(state, { type: 'open', step: 'experience' });
    expect(activeProject(state).reached).toBe('experience');
  });
});
