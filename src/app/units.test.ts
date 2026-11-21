import { describe, expect, it } from 'vitest';
import { inRoom, toRoom } from './units.ts';

describe('Raumnamen im Satz', () => {
  it('nennt den Raum, in dem ein Möbel steht, mit dem passenden Artikel', () => {
    expect(inRoom('Küche')).toBe('in der Küche');
    expect(inRoom('Bad')).toBe('im Bad');
    expect(inRoom('Wohnzimmer')).toBe('im Wohnzimmer');
    expect(inRoom('Flur')).toBe('im Flur');
    expect(inRoom('Speisekammer')).toBe('in der Speisekammer');
  });

  it('nennt das Ziel einer Tür nach derselben Regel', () => {
    expect(toRoom('Küche')).toBe('zur Küche');
    expect(toRoom('Bad')).toBe('zum Bad');
    expect(toRoom('Wohnzimmer')).toBe('zum Wohnzimmer');
    expect(toRoom('Speisekammer')).toBe('zur Speisekammer');
  });
});
