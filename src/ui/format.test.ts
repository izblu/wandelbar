import { describe, expect, it } from 'vitest';
import { formatClock, formatNumber, formatPrice, parseDecimal } from './format.ts';

describe('formatClock', () => {
  it('zeigt Stunden und Minuten', () => {
    expect(formatClock(7.5)).toBe('7:30');
    expect(formatClock(21.25)).toBe('21:15');
    expect(formatClock(6)).toBe('6:00');
  });

  it('rundet auf volle Minuten', () => {
    expect(formatClock(9.999)).toBe('10:00');
  });
});

describe('formatNumber und formatPrice', () => {
  it('nutzt das deutsche Komma', () => {
    expect(formatNumber(2.5)).toBe('2,5');
    expect(formatNumber(1234)).toBe('1.234');
  });

  it('zeigt Preise ohne Cent', () => {
    expect(formatPrice(1290)).toBe('1.290 €');
  });
});

describe('parseDecimal', () => {
  it.each([
    ['228', 228],
    [' 228 ', 228],
    ['2,5', 2.5],
    ['2.5', 2.5],
    ['1.234', 1234],
    ['1.234,5', 1234.5],
    ['1,234.5', 1234.5],
    ['-3', -3],
    ['0,75', 0.75],
  ])('liest „%s“ als %d', (text, expected) => {
    expect(parseDecimal(text)).toBe(expected);
  });

  it.each(['', 'abc', '2,5 m', '1.2.3', '--3'])('lehnt „%s“ ab', (text) => {
    expect(parseDecimal(text)).toBeNull();
  });
});
