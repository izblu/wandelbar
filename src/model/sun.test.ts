import { describe, expect, it } from 'vitest';
import { dayPhase, sunPosition } from './sun.ts';

describe('sunPosition', () => {
  it('steht mittags im Süden am höchsten', () => {
    const noon = sunPosition(13.25);
    expect(noon.azimuth).toBeCloseTo(180);
    expect(noon.elevation).toBeCloseTo(60);
  });

  it('steht morgens im Osten und abends im Westen', () => {
    expect(sunPosition(8).azimuth).toBeLessThan(180);
    expect(sunPosition(19).azimuth).toBeGreaterThan(180);
  });
});

describe('dayPhase', () => {
  it('ist am Vormittag Tag und am späten Abend Nacht', () => {
    expect(dayPhase(7.5)).toBe('day');
    expect(dayPhase(13)).toBe('day');
    expect(dayPhase(21.5)).toBe('night');
    expect(dayPhase(5.75)).toBe('night');
    expect(dayPhase(6)).toBe('day');
  });
});
