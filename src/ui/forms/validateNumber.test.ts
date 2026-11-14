import { describe, expect, it } from 'vitest';
import { validateNumber } from './validateNumber.ts';

describe('validateNumber', () => {
  it('nimmt Zahlen mit Komma oder Punkt an', () => {
    expect(validateNumber('228', {})).toEqual({ ok: true, value: 228 });
    expect(validateNumber('2,5', {})).toEqual({ ok: true, value: 2.5 });
  });

  it('übernimmt Nachkommastellen ungerundet', () => {
    expect(validateNumber('228,25', {})).toEqual({ ok: true, value: 228.25 });
    expect(validateNumber('0,125', { min: 0 })).toEqual({ ok: true, value: 0.125 });
    expect(validateNumber('abc', { example: 228.25 })).toEqual({
      ok: false,
      message: 'Gib eine Zahl ein, zum Beispiel 228,25.',
    });
  });

  it('erklärt bei Buchstaben oder leerem Feld, was einzugeben ist', () => {
    expect(validateNumber('abc', { example: 228 })).toEqual({
      ok: false,
      message: 'Gib eine Zahl ein, zum Beispiel 228.',
    });
    expect(validateNumber('', { example: 94 })).toMatchObject({ ok: false });
  });

  it('nennt Grenzen mit Einheit', () => {
    expect(validateNumber('0', { min: 1, unit: 'cm' })).toEqual({
      ok: false,
      message: 'Gib mindestens 1 cm ein.',
    });
    expect(validateNumber('1200', { max: 1000, unit: 'cm' })).toEqual({
      ok: false,
      message: 'Gib höchstens 1.000 cm ein.',
    });
  });
});
