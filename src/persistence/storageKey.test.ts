import { describe, expect, it } from 'vitest';
import { storageKey } from './storageKey.ts';

describe('storageKey', () => {
  it('enthält Basis-Pfad und Namen', () => {
    expect(storageKey('theme', '/wandelbar/')).toBe('wandelbar:/wandelbar/:theme');
  });

  it('trennt die Vorschau von der Hauptversion', () => {
    expect(storageKey('theme', '/wandelbar/preview/')).not.toBe(storageKey('theme', '/wandelbar/'));
  });

  it('nutzt ohne Basis-Pfad den des Builds', () => {
    expect(storageKey('theme')).toBe(`wandelbar:${import.meta.env.BASE_URL}:theme`);
  });
});
