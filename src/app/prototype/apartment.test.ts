import { describe, expect, it, vi } from 'vitest';
import { CATALOG, nextFurnitureId, sampleApartment } from './apartment.ts';

/** Frisch geladen wie nach dem Start der App: Es wurde noch kein Möbel hinzugefügt */
async function freshStart() {
  vi.resetModules();
  return import('./apartment.ts');
}

describe('nextFurnitureId', () => {
  it('gibt dem ersten Möbel nach dem Start eine freie Kennung, auch einem Nachttisch', async () => {
    // Die Beispielwohnung hat schon `nightstand-1` und `nightstand-2`
    const taken = new Set(sampleApartment().furniture.map((item) => item.id));
    expect(taken).toContain('nightstand-1');
    expect(taken).toContain('nightstand-2');

    // Jedes Möbel des Katalogs einmal als erstes
    for (const entry of CATALOG) {
      const app = await freshStart();
      const id = app.nextFurnitureId(entry.kind, app.sampleApartment().furniture);
      expect(taken, entry.name).not.toContain(id);
      expect(id.startsWith(`${entry.kind}-`)).toBe(true);
    }
  });

  it('vergibt beim Hinzufügen und Duplizieren nacheinander nie dieselbe Kennung', () => {
    let { furniture } = sampleApartment();
    const sofa = furniture.find((item) => item.kind === 'sofa');
    if (!sofa) throw new Error('Sofa fehlt');
    for (const base of ['nightstand', 'nightstand', sofa.id, sofa.id, 'armchair']) {
      const id = nextFurnitureId(base, furniture);
      expect(furniture.map((item) => item.id)).not.toContain(id);
      furniture = [...furniture, { ...sofa, id }];
    }
    expect(new Set(furniture.map((item) => item.id)).size).toBe(furniture.length);
  });
});
