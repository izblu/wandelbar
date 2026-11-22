import { describe, expect, it } from 'vitest';
import { composite, contrastLevel, contrastRatio } from './contrast.ts';

describe('contrastRatio', () => {
  it('ist 21 für Schwarz auf Weiß und 1 für gleiche Farben', () => {
    expect(contrastRatio([0, 0, 0], [255, 255, 255])).toBeCloseTo(21);
    expect(contrastRatio([90, 90, 90], [90, 90, 90])).toBeCloseTo(1);
  });

  it('hängt nicht von der Reihenfolge ab', () => {
    expect(contrastRatio([44, 91, 112], [251, 252, 251])).toBeCloseTo(
      contrastRatio([251, 252, 251], [44, 91, 112]),
    );
  });

  it('stimmt für Fjordblau auf Kalkweiß mit dem bekannten Wert überein', () => {
    // #2c5b70 auf #edf0ee
    expect(contrastRatio([44, 91, 112], [237, 240, 238])).toBeCloseTo(6.45, 1);
  });
});

describe('composite', () => {
  it('mischt halbdurchsichtig auf den Grund', () => {
    expect(composite([0, 0, 0], 0.5, [255, 255, 255])).toEqual([127.5, 127.5, 127.5]);
  });
});

describe('contrastLevel', () => {
  it('ordnet Stufen zu', () => {
    expect(contrastLevel(7.2)).toBe('AAA');
    expect(contrastLevel(4.6)).toBe('AA');
    expect(contrastLevel(3.1)).toBe('AA groß');
    expect(contrastLevel(2)).toBe('zu schwach');
  });
});
