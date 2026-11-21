import type { Selection } from './prototype/PlanScene.tsx';

/**
 * Antippbare Teile der Szene tragen `data-hit="art:id"`, z. B. `furniture:sofa`. Hier wird daraus
 * eine Auswahl.
 */

const KINDS: readonly Selection['kind'][] = ['furniture', 'wall', 'opening', 'room'];

export function parseHit(hit: string | null): Selection | null {
  if (!hit) return null;
  const [kind, id] = hit.split(':');
  if (!id || !KINDS.includes(kind as Selection['kind'])) return null;
  return { kind: kind as Selection['kind'], id };
}
