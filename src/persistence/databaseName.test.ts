import { describe, expect, it } from 'vitest';
import { databaseName } from './databaseName.ts';

describe('databaseName', () => {
  it('enthält den Basis-Pfad der Hauptversion', () => {
    expect(databaseName('/wandelbar/')).toBe('wandelbar:/wandelbar/');
  });

  it('trennt die Vorschau von der Hauptversion', () => {
    expect(databaseName('/wandelbar/preview/')).not.toBe(databaseName('/wandelbar/'));
  });

  it('nutzt ohne Argument den Basis-Pfad des Builds', () => {
    expect(databaseName()).toBe(`wandelbar:${import.meta.env.BASE_URL}`);
  });
});
