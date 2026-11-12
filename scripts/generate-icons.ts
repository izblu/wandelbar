/**
 * Erzeugt die PNG-Icons der PWA aus `public/favicon.svg`.
 * Aufruf: `node scripts/generate-icons.ts` (nutzt das Chromium von Playwright).
 *
 * Vorläufige Icons aus M0; das endgültige Icon entsteht in der Designphase (MD).
 */
import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const publicDir = fileURLToPath(new URL('../public/', import.meta.url));

interface IconTarget {
  file: string;
  size: number;
  /** Vollflächig ohne abgerundete Ecken (maskable, Apple). */
  fullBleed: boolean;
}

const TARGETS: IconTarget[] = [
  { file: 'pwa-192x192.png', size: 192, fullBleed: false },
  { file: 'pwa-512x512.png', size: 512, fullBleed: false },
  { file: 'maskable-icon-512x512.png', size: 512, fullBleed: true },
  { file: 'apple-touch-icon.png', size: 180, fullBleed: true },
];

const svg = await readFile(`${publicDir}favicon.svg`, 'utf8');
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  for (const target of TARGETS) {
    const source = target.fullBleed ? svg.replace(/rx="\d+"/, 'rx="0"') : svg;
    const dataUrl = `data:image/svg+xml;base64,${Buffer.from(source).toString('base64')}`;
    await page.setViewportSize({ width: target.size, height: target.size });
    await page.setContent(
      `<body style="margin:0"><img src="${dataUrl}" width="${String(target.size)}" height="${String(target.size)}" style="display:block"></body>`,
    );
    const png = await page.screenshot({ omitBackground: true });
    await writeFile(`${publicDir}${target.file}`, png);
    console.log(`${target.file} (${String(target.size)} px)`);
  }
} finally {
  await browser.close();
}
