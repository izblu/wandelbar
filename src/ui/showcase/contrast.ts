/** Kontrast nach WCAG 2.2 aus sRGB-Werten (0–255). */

export type Rgb = readonly [number, number, number];

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance([r, g, b]: Rgb): number {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: Rgb, b: Rgb): number {
  const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x) as [
    number,
    number,
  ];
  return (light + 0.05) / (dark + 0.05);
}

/** Legt eine halbdurchsichtige Farbe auf einen deckenden Grund. */
export function composite(top: Rgb, alpha: number, base: Rgb): Rgb {
  return [
    top[0] * alpha + base[0] * (1 - alpha),
    top[1] * alpha + base[1] * (1 - alpha),
    top[2] * alpha + base[2] * (1 - alpha),
  ];
}

/** Stufe für Text: AAA ab 7, AA ab 4,5, für große Schrift ab 3 */
export function contrastLevel(ratio: number): 'AAA' | 'AA' | 'AA groß' | 'zu schwach' {
  if (ratio >= 7) return 'AAA';
  if (ratio >= 4.5) return 'AA';
  if (ratio >= 3) return 'AA groß';
  return 'zu schwach';
}
