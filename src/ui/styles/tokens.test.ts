import { describe, expect, it } from 'vitest';

/**
 * Wächter für das Design-System: Feste Farbwerte stehen nur in tokens.css.
 * Alle anderen Stile lesen Tokens, damit hell und dunkel überall stimmen.
 */

const TOKENS_FILE = '/src/ui/styles/tokens.css';

const stylesheets = import.meta.glob<string>('/src/**/*.css', {
  query: '?raw',
  import: 'default',
  eager: true,
});

/** Hex-Werte, Farbfunktionen mit festen Zahlen und benannte Farben als Wert */
const FIXED_COLOR_PATTERNS: readonly RegExp[] = [
  /#[0-9a-f]{3,8}\b/i,
  /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/i,
  /:\s*(?:[^;{}]*\s)?(?:white|black|red|green|blue|gray|grey|silver|orange|yellow)\s*[;,)]/i,
];

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

function findFixedColors(css: string): string[] {
  return stripComments(css)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => FIXED_COLOR_PATTERNS.some((pattern) => pattern.test(line)));
}

describe('Farbwerte', () => {
  it('findet die Stildateien', () => {
    expect(Object.keys(stylesheets)).toContain(TOKENS_FILE);
    expect(Object.keys(stylesheets).length).toBeGreaterThan(5);
  });

  it('stehen nur in tokens.css', () => {
    const offenders = Object.entries(stylesheets)
      .filter(([file]) => file !== TOKENS_FILE)
      .flatMap(([file, css]) => findFixedColors(css).map((line) => `${file}: ${line}`));
    expect(offenders).toEqual([]);
  });

  it('erkennt feste Farben wirklich (Gegenprobe)', () => {
    expect(findFixedColors('a { color: #fff; }')).toHaveLength(1);
    expect(findFixedColors('a { box-shadow: 0 0 0 1px rgb(0 0 0 / 0.1); }')).toHaveLength(1);
    expect(findFixedColors('a { background: white; }')).toHaveLength(1);
    expect(findFixedColors('a { color: var(--color-ink); }')).toHaveLength(0);
    expect(
      findFixedColors('a { background: color-mix(in oklab, var(--a), var(--b) 20%); }'),
    ).toHaveLength(0);
    expect(findFixedColors('/* #fff */ a { color: currentColor; }')).toHaveLength(0);
  });
});
