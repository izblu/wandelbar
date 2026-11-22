import { describe, expect, it } from 'vitest';
import { resolveSheetTarget, springFrames } from './sheetPhysics.ts';

describe('resolveSheetTarget', () => {
  it('folgt beim langsamen Loslassen der näheren Hälfte', () => {
    expect(resolveSheetTarget(100, 0, 400)).toBe('open');
    expect(resolveSheetTarget(300, 0, 400)).toBe('peek');
  });

  it('folgt beim Wischen der Richtung, auch kurz nach dem Start', () => {
    expect(resolveSheetTarget(380, -1.2, 400)).toBe('open');
    expect(resolveSheetTarget(20, 1.2, 400)).toBe('peek');
  });

  it('verlängert eine langsame Bewegung ein Stück', () => {
    expect(resolveSheetTarget(180, 0.3, 400)).toBe('peek');
    expect(resolveSheetTarget(220, -0.3, 400)).toBe('open');
  });

  it('bleibt offen, wenn es nichts einzuklappen gibt', () => {
    expect(resolveSheetTarget(0, 2, 0)).toBe('open');
  });
});

describe('springFrames', () => {
  it('beginnt am Start und endet genau am Ziel', () => {
    const { frames } = springFrames(400, 0);
    expect(frames[0]).toBe(400);
    expect(frames.at(-1)).toBe(0);
  });

  it('kommt in unter einer Sekunde zur Ruhe', () => {
    const { durationMs } = springFrames(400, 0);
    expect(durationMs).toBeGreaterThan(200);
    expect(durationMs).toBeLessThan(1000);
  });

  it('schwingt höchstens wenige Pixel über das Ziel hinaus', () => {
    const { frames } = springFrames(400, 0);
    expect(Math.min(...frames)).toBeGreaterThan(-8);
  });

  it('nimmt die Wischgeschwindigkeit mit', () => {
    const still = springFrames(400, 0, 0).frames[1] ?? 400;
    const flicked = springFrames(400, 0, -2).frames[1] ?? 400;
    expect(flicked).toBeLessThan(still);
  });
});
