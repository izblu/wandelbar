import AxeBuilder from '@axe-core/playwright';
import type { Locator, Page, TestInfo } from '@playwright/test';
import { storageKey } from '../src/persistence/storageKey.ts';
import { expect } from './fixtures.ts';

/**
 * Hilfen für die E2E-Tests der App (Prototyp der Kernabläufe). `test` und `expect` kommen in den
 * Tests weiter aus `fixtures.ts`, damit der Datenschutz-Wächter mitläuft.
 */

const WCAG_AA_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/**
 * Schlüssel aus `useTour.ts`: Die Einführung gilt als gesehen. Getestet wird die Hauptversion
 * (Basis-Pfad wie `baseURL` in `playwright.config.ts`).
 */
const TOUR_SEEN_KEY = storageKey('einfuehrung-gesehen', '/wandelbar/');

export const isPhone = (testInfo: TestInfo) => testInfo.project.name === 'pixel';

/** Sammelt Fehler aus Konsole und Seite; am Ende eines Tests muss die Liste leer sein. */
export function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

/** Öffnet die App; ohne `tour` gilt die Einführung als schon gesehen. */
export async function openApp(page: Page, { tour = false } = {}) {
  if (!tour) {
    await page.addInitScript((key) => {
      window.localStorage.setItem(key, 'ja');
    }, TOUR_SEEN_KEY);
  }
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1, name: 'Wandelbar' })).toBeVisible();
  await expect(scene(page)).toBeVisible();
}

/** Die Szene auf der Bühne (Draufsicht, Puppenhaus oder Papierplan) */
export function scene(page: Page): Locator {
  return page.locator('svg.app-scene');
}

export function step(page: Page, name: string): Locator {
  return page
    .getByRole('navigation', { name: 'Arbeitsschritte' })
    .getByRole('button', { name: new RegExp(`^${name}`) });
}

export async function goToStep(page: Page, name: string) {
  await step(page, name).click();
  await expect(step(page, name)).toHaveAttribute('aria-current', 'step');
}

export function tools(page: Page): Locator {
  return page.getByRole('toolbar', { name: /^Werkzeuge/ });
}

/**
 * Die Eigenschaftenkarte zu einem Objekt. Auf dem Handy ist sie ein Blatt von unten, dessen Körper
 * eingeklappt `inert` ist: Dann wird es aufgeklappt, damit Felder bedienbar sind.
 */
export async function openCard(page: Page, name: string | RegExp): Promise<Locator> {
  const card = page.getByRole('region', { name });
  await expect(card).toBeVisible();
  const handle = card.getByRole('button', { name: 'Alle Eigenschaften zeigen' });
  if (await handle.isVisible()) {
    await handle.click();
    await expect(card.getByRole('button', { name: 'Eigenschaften einklappen' })).toBeVisible();
  }
  return card;
}

/** Klappt eine aufgeklappte Handy-Karte ein, damit die Werkzeugleiste darunter frei ist. */
export async function collapseCard(page: Page) {
  const collapse = page.getByRole('button', { name: 'Eigenschaften einklappen' });
  if (await collapse.isVisible()) {
    await collapse.click();
    await expect(collapse).toBeHidden();
  }
}

/** Ein Raum in der Szene; antippbar, wenn der Schritt Räume auswählen lässt */
export function room(page: Page, id: string): Locator {
  return page.locator(`[data-hit="room:${id}"]`);
}

/**
 * Wartet, bis alle endlichen Animationen fertig sind. Sonst misst axe den Kontrast eines halb
 * durchsichtigen Zwischenbilds.
 */
async function settleAnimations(page: Page) {
  await page.evaluate(async () => {
    const running = document
      .getAnimations()
      .filter((animation) => animation.effect?.getTiming().iterations !== Infinity);
    await Promise.allSettled(running.map((animation) => animation.finished));
  });
}

export async function axeViolations(page: Page) {
  await settleAnimations(page);
  const results = await new AxeBuilder({ page }).withTags(WCAG_AA_TAGS).analyze();
  return results.violations.map((violation) => ({
    id: violation.id,
    nodes: violation.nodes.map((node) => node.target.join(' ')),
  }));
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Umriss mehrerer Elemente auf dem Bildschirm zusammen (z. B. aller Böden im Puppenhaus) */
export async function unionBox(locator: Locator): Promise<Box> {
  return locator.evaluateAll((elements) => {
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const element of elements) {
      const rect = element.getBoundingClientRect();
      x0 = Math.min(x0, rect.left);
      y0 = Math.min(y0, rect.top);
      x1 = Math.max(x1, rect.right);
      y1 = Math.max(y1, rect.bottom);
    }
    return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
  });
}

export const center = (box: Box) => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 });

/** Ziehen mit der Maus in mehreren Schritten, wie eine Hand */
export async function drag(
  page: Page,
  from: { x: number; y: number },
  by: { x: number; y: number },
  options: { button?: 'left' | 'right' | 'middle' } = {},
) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down(options);
  for (let index = 1; index <= 8; index += 1) {
    await page.mouse.move(from.x + (by.x * index) / 8, from.y + (by.y * index) / 8);
  }
  await page.mouse.up(options);
}
